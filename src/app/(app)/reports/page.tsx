

// @ts-nocheck
'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Printer } from 'lucide-react';
import { IncomeStatement } from '@/components/reports/income-statement';
import { GeneralJournal } from '@/components/reports/general-journal';
import { BalanceSheet } from '@/components/reports/balance-sheet';
import { CashFlowStatement } from '@/components/reports/cash-flow-statement';
import { GeneralLedger } from '@/components/reports/general-ledger';
import { AdvancedBEPROIAnalysis } from '@/components/reports/advanced-bep-roi-analysis';
import { ShareReportDialog } from '@/components/reports/share-report-dialog';
import { useAppState } from '@/hooks/use-app-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx-js-style';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS, CASH_ACCOUNTS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReportsPage() {
  const { transactions, inventory, companyProfile, dateRange, setDateRange } = useAppState();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [quickMonth, setQuickMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [quickYear, setQuickYear] = useState<string>(new Date().getFullYear().toString());

  const handleQuickSelect = () => {
    const year = parseInt(quickYear);
    const month = parseInt(quickMonth);
    setDateRange({
      from: new Date(year, month - 1, 1),
      to: new Date(year, month, 0)
    });
  };

  const reportData = useMemo(() => {
    // --- 0. Generate Virtual Depreciation Transactions ---
    const virtualDepreciations: any[] = [];
    const today = new Date();

    transactions.forEach(t => {
      if (['Peralatan', 'Aset Tak Berwujud'].includes(t.category) && t.amount > 0 && t.usefulLifeInMonths) {
        const cost = t.amount;
        const salvage = t.salvageValue || 0;
        const lifeMonths = t.usefulLifeInMonths;
        const monthlyAmount = (cost - salvage) / lifeMonths;

        if (monthlyAmount <= 0) return;

        let currentDate = new Date(t.date);
        // Move to the end of the acquisition month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        let monthsCalculated = 0;
        while (monthsCalculated < lifeMonths && currentDate <= today) {
          const category = t.category === 'Peralatan' ? 'Beban Penyusutan' : 'Beban Amortisasi';
          
          virtualDepreciations.push({
            id: `${t.id}-dep-${monthsCalculated}`,
            date: format(currentDate, 'yyyy-MM-dd'),
            description: `Auto (${t.category}): ${t.description} (Bulan ke-${monthsCalculated + 1})`,
            amount: monthlyAmount,
            type: 'cash-out',
            accountId: '',
            category: category,
          });

          // Move to next month's end
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
          monthsCalculated++;
        }
      }
    });

    const augmentedTransactions = [...transactions, ...virtualDepreciations];

    // --- 0.5 Build Extended Chart of Accounts ---
    const extendedCOA = [...CHART_OF_ACCOUNTS];
    const knownAccountNames = new Set(extendedCOA.map(a => a.name));
    
    // Add dynamically input Kas accounts
    augmentedTransactions.forEach(t => {
      const addIfMissing = (accName: string) => {
        if (accName && !knownAccountNames.has(accName)) {
          extendedCOA.push({
            id: `10XX-${accName.substring(0,4).toUpperCase()}`, // Temp ID
            name: accName,
            type: 'Assets',
            category: 'Current Assets'
          });
          knownAccountNames.add(accName);
        }
      };
      
      const acc = t.accountId || 'Kas Bank BCA';
      addIfMissing(acc);
      if (t.toAccountId) {
        addIfMissing(t.toAccountId);
      }
    });

    const allCashAccounts = new Set([...CASH_ACCOUNTS, ...extendedCOA.filter(a => !CHART_OF_ACCOUNTS.some(ca => ca.name === a.name)).map(a => a.name)]);

    // --- 1. Universal Journal Entry Generation ---
    let baseJournalEntries = augmentedTransactions.flatMap(t => {
      const account = extendedCOA.find(a => a.name === t.category);
      const accountType = account?.type;
      const cashAccountName = t.accountId || "Kas Bank BCA";

      // Special handling for non-cash entries
      if (t.category === 'Beban Penyusutan') {
        return [
          { ...t, entryType: 'Debit', accountName: 'Beban Penyusutan', amount: t.amount },
          { ...t, entryType: 'Credit', accountName: 'Akumulasi Penyusutan - Peralatan', amount: t.amount }
        ];
      }
      if (t.category === 'Beban Amortisasi') {
         return [
          { ...t, entryType: 'Debit', accountName: 'Beban Amortisasi', amount: t.amount },
          { ...t, entryType: 'Credit', accountName: 'Akumulasi Amortisasi', amount: t.amount }
        ];
      }

      const isNonCashAdj = t.description?.startsWith('[NON-CASH-ADJ]');
      if (isNonCashAdj) {
          if (t.category === 'Beban Barang Rusak/Hilang') {
             return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: 'Persediaan Barang Dagang', amount: t.amount }];
          } else if (t.category === 'Persediaan Barang Dagang') {
             return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: 'Pendapatan Lain-lain', amount: t.amount }];
          }
      }

      if (t.type === 'transfer') {
        const toAccount = t.toAccountId || "Kas Bank BCA";
        return [
          { ...t, entryType: 'Debit', accountName: toAccount, amount: t.amount },
          { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }
        ];
      }

      // Standard cash transactions
      if (t.type === 'cash-in') {
          return [ { ...t, entryType: 'Debit', accountName: cashAccountName, amount: t.amount }, { ...t, entryType: 'Credit', accountName: t.category, amount: t.amount }];
      } else { // cash-out
          if (accountType === 'Assets' && !allCashAccounts.has(t.category)) {
              return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
          }
          return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
      }
    });

    // --- 2. Add COGS Entries ---
    const cogsEntries: any[] = [];
    augmentedTransactions.forEach(t => {
      const isSale = t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan');
      if (isSale) {
        if (t.items && t.items.length > 0) {
          t.items.forEach((itemEntry: any, i: number) => {
            const item = inventory.find(inv => inv.id === itemEntry.itemId);
            if (item) {
              const cogsAmount = item.costPerUnit * itemEntry.quantity;
              if (cogsAmount > 0) {
                cogsEntries.push({ ...t, id: `${t.id}-cogs-${i}`, entryType: 'Debit', accountName: 'Harga Pokok Penjualan', amount: cogsAmount, description: `${t.description} (HPP - ${item.name})` });
                cogsEntries.push({ ...t, id: `${t.id}-cogs-${i}`, entryType: 'Credit', accountName: 'Persediaan Barang Dagang', amount: cogsAmount, description: `${t.description} (HPP - ${item.name})` });
              }
            }
          });
        } else if (t.itemId && t.quantity) {
          const item = inventory.find(i => i.id === t.itemId); // Use inventory state as the source of truth for item costs
          if (item) {
            const cogsAmount = item.costPerUnit * t.quantity;
            if (cogsAmount > 0) {
              cogsEntries.push({ ...t, id: `${t.id}-cogs`, entryType: 'Debit', accountName: 'Harga Pokok Penjualan', amount: cogsAmount, description: `${t.description} (HPP)` });
              cogsEntries.push({ ...t, id: `${t.id}-cogs`, entryType: 'Credit', accountName: 'Persediaan Barang Dagang', amount: cogsAmount, description: `${t.description} (HPP)` });
            }
          }
        }
      }
    });

    const allJournalEntries = [...baseJournalEntries, ...cogsEntries];


    // --- 3. Calculate Final Account Balances ---
    const fromDate = dateRange?.from ? new Date(dateRange.from).getTime() : 0;
    const toDate = dateRange?.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : Infinity;

    const startingEntries = allJournalEntries.filter(entry => new Date(entry.date).getTime() < fromDate);
    const periodEntries = allJournalEntries.filter(entry => {
      const tTime = new Date(entry.date).getTime();
      return tTime >= fromDate && tTime <= toDate;
    });

    const startingBalances: { [key: string]: number } = {};
    const periodBalances: { [key: string]: number } = {};
    extendedCOA.forEach(acc => { startingBalances[acc.name] = 0; periodBalances[acc.name] = 0; });

    startingEntries.forEach(entry => {
        const accountInfo = extendedCOA.find(a => a.name === entry.accountName);
        if (!accountInfo) return;
        const amount = entry.amount;
        if (['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive') {
            startingBalances[entry.accountName] += (entry.entryType === 'Debit' ? amount : -amount);
        } else {
            startingBalances[entry.accountName] += (entry.entryType === 'Credit' ? amount : -amount);
        }
    });

    periodEntries.forEach(entry => {
        const accountInfo = extendedCOA.find(a => a.name === entry.accountName);
        if (!accountInfo) return;
        const amount = entry.amount;
        if (['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive') {
            periodBalances[entry.accountName] += (entry.entryType === 'Debit' ? amount : -amount);
        } else {
            periodBalances[entry.accountName] += (entry.entryType === 'Credit' ? amount : -amount);
        }
    });

    let prevRevenues = 0;
    let prevExpenses = 0;
    Object.entries(startingBalances).forEach(([accountName, balance]) => {
      const accountInfo = extendedCOA.find(a => a.name === accountName);
      if (accountInfo?.type === 'Revenue') prevRevenues += balance;
      if (accountInfo?.type === 'Expenses') prevExpenses += balance;
    });
    const prevNetIncome = prevRevenues - prevExpenses;
    const prevPrive = startingBalances['Prive'] || 0;
    const accumulatedRetainedEarnings = (startingBalances['Laba Ditahan'] || 0) + prevNetIncome - prevPrive;

    // --- 4. Build Reports from Final Balances ---

    // Income Statement Data (Only Period)
    const revenues: { [key: string]: number } = {};
    const expenses: { [key: string]: number } = {};
    Object.entries(periodBalances).forEach(([accountName, balance]) => {
      const accountInfo = extendedCOA.find(a => a.name === accountName);
      if (!accountInfo) return;
      if (accountInfo.type === 'Revenue' && balance !== 0) revenues[accountName] = balance;
      if (accountInfo.type === 'Expenses' && balance !== 0) expenses[accountName] = balance;
    });
    const totalRevenue = Object.values(revenues).reduce((sum, amount) => sum + amount, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    // Balance Sheet Data (Starting + Period)
    const assets: { [key: string]: number } = {};
    const liabilities: { [key: string]: number } = {};
    
    extendedCOA.forEach(accountInfo => {
        const totalBalance = startingBalances[accountInfo.name] + periodBalances[accountInfo.name];
        if (totalBalance !== 0) {
            if (accountInfo.type === 'Assets') assets[accountInfo.name] = totalBalance;
            if (accountInfo.type === 'Liabilities') liabilities[accountInfo.name] = totalBalance;
        }
    });

    const equityAccounts: { [key: string]: number } = {
      'Modal Pemilik': startingBalances['Modal Pemilik'] + periodBalances['Modal Pemilik'],
      'Laba Ditahan': accumulatedRetainedEarnings + periodBalances['Laba Ditahan'],
      'Laba Bersih (Periode Berjalan)': netIncome,
      'Prive': periodBalances['Prive'],
    };
    
    const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
    const totalEquity = (equityAccounts['Modal Pemilik'] || 0) + (equityAccounts['Laba Ditahan'] || 0) + netIncome - (equityAccounts['Prive'] || 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // General Journal Data
    const journalEntries = periodEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id) || (a.entryType === 'Debit' ? -1 : 1));

    // Cash Flow Data
    const operatingFlows: { name: string, amount: number }[] = [];
    const investingFlows: { name: string, amount: number }[] = [];
    const financingFlows: { name: string, amount: number }[] = [];
    
    const cashTransactions = augmentedTransactions.filter(t => {
      const tTime = new Date(t.date).getTime();
      return tTime >= fromDate && tTime <= toDate && !['Beban Penyusutan', 'Beban Amortisasi'].includes(t.category) && t.type !== 'transfer';
    });
    
    cashTransactions.forEach(t => {
      const account = extendedCOA.find(a => a.name === t.category);
      if (!account || allCashAccounts.has(t.category)) return;
      
      const amount = t.type === 'cash-in' ? t.amount : -t.amount;
      
      if (['Current Assets', 'Current Liabilities'].includes(account.category) || ['Revenue', 'Expenses'].includes(account.type)) {
        if (!allCashAccounts.has(account.name)) {
           operatingFlows.push({ name: t.description, amount: amount });
        }
      } else if (['Fixed Assets', 'Intangible Assets'].includes(account.category)) {
        investingFlows.push({ name: t.description, amount: amount });
      } else if (['Long-term Liabilities', 'Owner Equity'].includes(account.category)) {
         financingFlows.push({ name: t.description, amount: amount });
      }
    });

    const totalOperating = operatingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    const totalInvesting = investingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    const totalFinancing = financingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    
    const beginningCash = Array.from(allCashAccounts).reduce((sum, accName) => sum + (startingBalances[accName] || 0), 0);
    const netCashFlow = totalOperating + totalInvesting + totalFinancing;
    const endingCash = beginningCash + netCashFlow;

    // General Ledger Data
    const allJournalEntriesForLedger = periodEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ledgerAccountsData: { [key: string]: { entries: any[], balance: number, accountInfo: any, startingBalance: number } } = {};
    
    extendedCOA.forEach(accountInfo => {
        const startBal = startingBalances[accountInfo.name] || 0;
        let runningBalance = startBal;
        let displayStartBal = startBal;
        
        if (accountInfo.name === 'Laba Ditahan') {
           runningBalance = accumulatedRetainedEarnings;
           displayStartBal = accumulatedRetainedEarnings;
        } else if (['Revenue', 'Expenses', 'Prive'].includes(accountInfo.type) || accountInfo.name === 'Prive') {
           runningBalance = 0;
           displayStartBal = 0;
        }

        const entriesForAccount = allJournalEntriesForLedger.filter(entry => entry.accountName === accountInfo.name);
        
        const entriesWithBalance = entriesForAccount.map(entry => {
             const debit = entry.entryType === 'Debit' ? entry.amount : 0;
             const credit = entry.entryType === 'Credit' ? entry.amount : 0;
             if (['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive') { runningBalance += debit - credit; } 
             else { runningBalance += credit - debit; }
            return {...entry, balance: runningBalance};
        });
        
        ledgerAccountsData[accountInfo.name] = { 
            entries: entriesWithBalance, 
            balance: runningBalance, 
            accountInfo,
            startingBalance: displayStartBal
        };
    });
    const sortedLedgerAccounts = Object.values(ledgerAccountsData).sort((a, b) => (a.accountInfo?.id ?? 9999) > (b.accountInfo?.id ?? 9999) ? 1 : -1);


    return {
      incomeStatement: { revenues, totalRevenue, expenses, totalExpenses, netIncome },
      balanceSheet: { assets, liabilities, equity: equityAccounts, totalAssets, totalLiabilitiesAndEquity },
      generalJournal: { journalEntries },
      cashFlow: { operatingFlows, totalOperating, investingFlows, totalInvesting, financingFlows, totalFinancing, netCashFlow, beginningCash, endingCash },
      generalLedger: { sortedLedgerAccounts }
    };
  }, [transactions, inventory, companyProfile.name, dateRange]);

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const periodString = dateRange?.from
      ? `Periode: ${format(dateRange.from, 'd MMM yyyy', { locale: id })} - ${dateRange.to ? format(dateRange.to, 'd MMM yyyy', { locale: id }) : 'Sekarang'}`
      : `Seluruh Waktu (Hingga ${today})`;
    const companyName = companyProfile.name;
    const journalSheetName = 'Jurnal Umum';

    const sanitizeSheetName = (name: string) => name.replace(/[\\/*?[\]:]/g, '').substring(0, 31);

    // COLORS
    const CLR = {
      navy: '1E3A5F', blue: '247BA0', blueMid: 'D0E8F5',
      blueLight: 'EBF4FA', yellow: 'FFFDE7', greenLight: 'E8F5E9',
      greenHdr: '1B6B38', white: 'FFFFFF', textGray: '6B7280', border: 'B8D4E8',
    };

    // BORDERS
    const bThin = { top: { style: 'thin', color: { rgb: CLR.border } }, bottom: { style: 'thin', color: { rgb: CLR.border } }, left: { style: 'thin', color: { rgb: CLR.border } }, right: { style: 'thin', color: { rgb: CLR.border } } };
    const bMed  = { top: { style: 'medium', color: { rgb: CLR.blue } }, bottom: { style: 'medium', color: { rgb: CLR.blue } }, left: { style: 'thin', color: { rgb: CLR.border } }, right: { style: 'thin', color: { rgb: CLR.border } } };

    // STYLE FACTORIES
    const fnt  = (o: any) => ({ name: 'Calibri', sz: 10, ...o });
    const sTitle  = { font: fnt({ bold: true, sz: 16, color: { rgb: CLR.navy } }) };
    const sSub    = { font: fnt({ bold: true, sz: 12, color: { rgb: CLR.blue } }) };
    const sPer    = { font: fnt({ italic: true, sz: 10, color: { rgb: CLR.textGray } }) };
    const sNote   = { font: fnt({ italic: true, sz: 9,  color: { rgb: CLR.textGray } }) };
    const sBold   = { font: fnt({ bold: true }) };
    const sHdr = (center = false) => ({
      font: fnt({ bold: true, color: { rgb: CLR.white } }),
      fill: { fgColor: { rgb: CLR.blue } },
      alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true },
      border: bThin,
    });
    const sGrnHdr = () => ({ ...sHdr(true), fill: { fgColor: { rgb: CLR.greenHdr } } });
    const sRow = (alt = false, right = false) => ({
      font: fnt({}), fill: { fgColor: { rgb: alt ? CLR.blueLight : CLR.white } },
      border: bThin, alignment: { horizontal: right ? 'right' : 'left', vertical: 'center' },
    });
    const sTot = (right = false) => ({
      font: fnt({ bold: true, color: { rgb: CLR.navy } }), fill: { fgColor: { rgb: CLR.blueMid } },
      border: bMed, alignment: { horizontal: right ? 'right' : 'left', vertical: 'center' },
    });
    const sInp = (right = false, green = false) => ({
      font: fnt({}), fill: { fgColor: { rgb: green ? CLR.greenLight : CLR.yellow } },
      border: bThin, alignment: { horizontal: right ? 'right' : 'left', vertical: 'center' },
    });

    const nFmt = `_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)`;

    // PRINT / VIEW SETTINGS
    const setUI = (ws: any, landscape = false) => {
      ws['!sheetViews']   = [{ showGridLines: false, zoomScale: 100 }];
      ws['!pageSetup']    = { paperSize: 9, orientation: landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      ws['!printOptions'] = { gridLines: false };
      ws['!margins']      = { left: 0.55, right: 0.55, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
    };

    // APPLY NUMBER FORMAT TO COLUMNS
    const applyNF = (ws: any, cols: number[]) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (const C of cols) {
          const ref = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[ref]) ws[ref] = { t: 'n', v: 0 };
          ws[ref].z = nFmt;
        }
      }
    };

    // STYLE TABLE ROWS (alternating, header, totals)
    const styleTable = (ws: any, hdrRow: number, dataStart: number, totRows: number[] = []) => {
      setUI(ws);
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const ex1    = R + 1;
        const isHdr  = ex1 === hdrRow;
        const isTot  = totRows.includes(ex1);
        const isData = ex1 >= dataStart && !isTot;
        const isAlt  = isData && (ex1 - dataStart) % 2 === 1;
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const ref  = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[ref];
          if (!cell || (cell.v === undefined && !cell.f && !isHdr)) continue;
          const isR  = typeof cell.v === 'number' || (cell.z && (cell.z as string).includes('#'));
          if (isHdr)       cell.s = { ...cell.s, ...sHdr(C > 0) };
          else if (isTot)  cell.s = { ...cell.s, ...sTot(isR) };
          else if (isData) cell.s = { ...cell.s, ...sRow(isAlt, isR) };
        }
      }
    };

    const backBtn = {
      v: 'MENU', l: { Target: "#'DAFTAR ISI'!A1" },
      s: { font: fnt({ bold: true, color: { rgb: CLR.white } }), fill: { fgColor: { rgb: CLR.blue } }, alignment: { horizontal: 'center' }, border: bThin },
    };

    const ACCT_DATA_START = 6;
    const acctRef = `'Daftar Akun'!$A$${ACCT_DATA_START}:$A$${ACCT_DATA_START + CHART_OF_ACCOUNTS.length}`;

    // 0. DAFTAR ISI
    const lnk = (label: string, target: string) => ({
      v: label, l: { Target: `#'${target}'!A1` },
      s: { font: fnt({ color: { rgb: CLR.blue }, underline: true, sz: 10 }) },
    });
    const tocData: any[] = [
      [{ v: 'LAPORAN KEUANGAN', s: sTitle }],
      [{ v: companyName, s: { font: fnt({ bold: true, sz: 13, color: { rgb: CLR.navy } }) } }],
      [{ v: periodString, s: sPer }],
      [{ v: `Dicetak: ${today}`, s: sNote }],
      [],
      [{ v: 'DAFTAR ISI - Klik link di bawah untuk berpindah ke sheet:', s: { font: fnt({ bold: true, sz: 11, color: { rgb: CLR.navy } }) } }],
      [],
      [{ v: '1. ENTRI & REFERENSI', s: { font: fnt({ bold: true, sz: 11, color: { rgb: CLR.blue } }) } }],
      ['    ', lnk('Input Tambahan (Entri Transaksi)', 'Input Tambahan')],
      ['    ', lnk('Jurnal Umum', journalSheetName)],
      ['    ', lnk('Katalog Produk & HPP', 'Katalog Produk')],
      ['    ', lnk('Daftar Akun (Referensi)', 'Daftar Akun')],
      [],
      [{ v: '2. LAPORAN UTAMA', s: { font: fnt({ bold: true, sz: 11, color: { rgb: CLR.blue } }) } }],
      ['    ', lnk('Laporan Laba Rugi', 'Laba Rugi')],
      ['    ', lnk('Neraca (Posisi Keuangan)', 'Neraca')],
      ['    ', lnk('Laporan Arus Kas', 'Arus Kas')],
      [],
      [{ v: '3. ANALISIS KHUSUS', s: { font: fnt({ bold: true, sz: 11, color: { rgb: CLR.blue } }) } }],
      ['    ', lnk('Audit & Investor Dashboard', 'Audit & Investor')],
      [],
      [{ v: '4. BUKU BESAR (PER AKUN)', s: { font: fnt({ bold: true, sz: 11, color: { rgb: CLR.blue } }) } }],
    ];
    CHART_OF_ACCOUNTS.forEach(acc => {
      const safeName = sanitizeSheetName(acc.name);
      tocData.push(['    ', { v: acc.name, l: { Target: `#'${safeName}'!A1` }, s: { font: fnt({ color: { rgb: '3c78d8' }, underline: true, sz: 10 }) } }]);
    });
    const wsTOC = XLSX.utils.aoa_to_sheet(tocData);
    wsTOC['!cols'] = [{ wch: 5 }, { wch: 65 }];
    setUI(wsTOC);
    XLSX.utils.book_append_sheet(wb, wsTOC, 'DAFTAR ISI');

    // 1. KATALOG PRODUK
    const KATALOG_DATA_START = 7;
    const katalogRef = inventory.length > 0
      ? `'Katalog Produk'!$A$${KATALOG_DATA_START}:$A$${KATALOG_DATA_START + inventory.length - 1}`
      : '"---"';
    const katalogData: any[] = [
      [{ v: companyName, s: sTitle }, '', backBtn],
      [{ v: 'Katalog Produk & HPP per Unit', s: sSub }],
      [{ v: `Data inventori per ${today}`, s: sPer }],
      [{ v: 'Perbarui nilai HPP di sini jika ada perubahan harga beli. Nilai di kolom B dipakai otomatis di Input Tambahan via VLOOKUP.', s: sNote }],
      [],
      [{ v: 'Nama Produk', s: sHdr() }, { v: 'HPP / Unit (Rp)', s: sHdr(true) }, { v: 'Stok Saat Ini', s: sHdr(true) }],
    ];
    inventory.forEach(item => {
      katalogData.push([item.name, { t: 'n', v: item.costPerUnit, z: nFmt }, { t: 'n', v: item.stock }]);
    });
    if (inventory.length === 0) katalogData.push(['(Belum ada produk di inventori)', '', '']);
    const wsKatalog = XLSX.utils.aoa_to_sheet(katalogData);
    wsKatalog['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }];
    styleTable(wsKatalog, 6, KATALOG_DATA_START);
    XLSX.utils.book_append_sheet(wb, wsKatalog, 'Katalog Produk');

    // 2. JURNAL UMUM
    const JRNL_HDR  = 5;
    const JRNL_DATA = 6;
    const INPUT_DATA = 8;
    const MAX_INPUTS = 200;

    const journalData: any[] = [
      [{ v: companyName, s: sTitle }, '', '', '', '', '', '', '', backBtn],
      [{ v: 'Jurnal Umum', s: sSub }],
      [{ v: periodString, s: sPer }],
      [],
      [
        { v: 'Tanggal', s: sHdr() }, { v: 'ID Transaksi', s: sHdr() },
        { v: 'Nama Akun', s: sHdr() }, { v: 'Keterangan', s: sHdr() },
        { v: 'Debit (Rp)', s: sHdr(true) }, { v: 'Kredit (Rp)', s: sHdr(true) },
        { v: 'Cek Akun', s: sHdr(true) },
        { v: 'HelperBB', s: { font: fnt({ sz: 7, color: { rgb: CLR.textGray } }), fill: { fgColor: { rgb: 'EEEEEE' } } } },
        backBtn,
      ],
    ];

    let helperCnt: Record<string, number> = {};
    reportData.generalJournal.journalEntries.forEach((entry, idx) => {
      const row  = JRNL_DATA + idx;
      const akun = entry.accountName;
      helperCnt[akun] = (helperCnt[akun] || 0) + 1;
      journalData.push([
        { t: 's', v: format(new Date(entry.date), 'yyyy-MM-dd') },
        { t: 's', v: entry.id },
        { t: 's', v: akun },
        { t: 's', v: entry.description },
        { t: 'n', v: entry.entryType === 'Debit'  ? entry.amount : 0, z: nFmt },
        { t: 'n', v: entry.entryType === 'Credit' ? entry.amount : 0, z: nFmt },
        { t: 'str', f: `IF(C${row}="","",IF(ISNUMBER(MATCH(C${row},${acctRef},0)),"OK","CEK AKUN!"))` },
        { t: 'str', v: `${akun}${helperCnt[akun]}`, f: `IF(C${row}="","",C${row}&COUNTIF($C$${JRNL_DATA}:C${row},C${row}))` },
      ]);
    });

    const BLANK_JRNL = JRNL_DATA + reportData.generalJournal.journalEntries.length;
    for (let i = 0; i < 500; i++) {
      const row = BLANK_JRNL + i;
      journalData.push([
        '', { t: 'str', f: `IF(C${row}="","",IF(A${row}<>"","TRX-"&TEXT(ROW(),"0000"),B${row-1}))` },
        '', '',
        { t: 'n', v: 0, z: nFmt }, { t: 'n', v: 0, z: nFmt },
        { t: 'str', f: `IF(C${row}="","",IF(ISNUMBER(MATCH(C${row},${acctRef},0)),"OK","CEK AKUN!"))` },
        { t: 'str', f: `IF(C${row}="","",C${row}&COUNTIF($C$${JRNL_DATA}:C${row},C${row}))` },
      ]);
    }

    // Input Tambahan -> 4 journal rows per input
    const INPUT_JRNL_START = journalData.length + 1;
    for (let i = 1; i <= MAX_INPUTS; i++) {
      const IR  = INPUT_DATA + i - 1;
      const dR  = INPUT_JRNL_START + (i - 1) * 4;
      const cR  = dR + 1;
      const dH  = dR + 2;
      const cH  = dR + 3;
      const has   = `'Input Tambahan'!D${IR}<>""`;
      const isCI  = `'Input Tambahan'!D${IR}="cash-in"`;
      const hasHP = `AND(${has},${isCI},'Input Tambahan'!N${IR}>0)`;
      const pad   = String(i).padStart(3, '0');

      journalData.push([
        { t: 'str', f: `IF(${has},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")` },
        { t: 'str', f: `IF(${has},"ADJ-${pad}-D","")` },
        { t: 'str', f: `IF(${has},IF(${isCI},'Input Tambahan'!E${IR},'Input Tambahan'!F${IR}),"")` },
        { t: 'str', f: `IF(${has},'Input Tambahan'!C${IR},"")` },
        { t: 'n', f: `IF(${has},IF(ISNUMBER('Input Tambahan'!G${IR}),'Input Tambahan'!G${IR},0),0)`, z: nFmt },
        { t: 'n', v: 0, z: nFmt },
        { t: 'str', f: `IF(C${dR}="","",IF(ISNUMBER(MATCH(C${dR},${acctRef},0)),"OK","CEK AKUN!"))` },
        { t: 'str', f: `IF(C${dR}="","",C${dR}&COUNTIF($C$${JRNL_DATA}:C${dR},C${dR}))` },
      ]);
      journalData.push([
        { t: 'str', f: `IF(${has},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")` },
        { t: 'str', f: `IF(${has},"ADJ-${pad}-K","")` },
        { t: 'str', f: `IF(${has},IF(${isCI},'Input Tambahan'!F${IR},'Input Tambahan'!E${IR}),"")` },
        { t: 'str', f: `IF(${has},'Input Tambahan'!C${IR},"")` },
        { t: 'n', v: 0, z: nFmt },
        { t: 'n', f: `IF(${has},IF(ISNUMBER('Input Tambahan'!G${IR}),'Input Tambahan'!G${IR},0),0)`, z: nFmt },
        { t: 'str', f: `IF(C${cR}="","",IF(ISNUMBER(MATCH(C${cR},${acctRef},0)),"OK","CEK AKUN!"))` },
        { t: 'str', f: `IF(C${cR}="","",C${cR}&COUNTIF($C$${JRNL_DATA}:C${cR},C${cR}))` },
      ]);
      journalData.push([
        { t: 'str', f: `IF(${hasHP},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")` },
        { t: 'str', f: `IF(${hasHP},"ADJ-${pad}-HD","")` },
        { t: 'str', f: `IF(${hasHP},"Harga Pokok Penjualan","")` },
        { t: 'str', f: `IF(${hasHP},'Input Tambahan'!C${IR},"")` },
        { t: 'n', f: `IF(${hasHP},'Input Tambahan'!N${IR},0)`, z: nFmt },
        { t: 'n', v: 0, z: nFmt },
        { t: 'str', f: `IF(C${dH}="","",IF(ISNUMBER(MATCH(C${dH},${acctRef},0)),"OK","CEK AKUN!"))` },
        { t: 'str', f: `IF(C${dH}="","",C${dH}&COUNTIF($C$${JRNL_DATA}:C${dH},C${dH}))` },
      ]);
      journalData.push([
        { t: 'str', f: `IF(${hasHP},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")` },
        { t: 'str', f: `IF(${hasHP},"ADJ-${pad}-HK","")` },
        { t: 'str', f: `IF(${hasHP},"Persediaan Barang Dagang","")` },
        { t: 'str', f: `IF(${hasHP},'Input Tambahan'!C${IR},"")` },
        { t: 'n', v: 0, z: nFmt },
        { t: 'n', f: `IF(${hasHP},'Input Tambahan'!N${IR},0)`, z: nFmt },
        { t: 'str', f: `IF(C${cH}="","",IF(ISNUMBER(MATCH(C${cH},${acctRef},0)),"OK","CEK AKUN!"))` },
        { t: 'str', f: `IF(C${cH}="","",C${cH}&COUNTIF($C$${JRNL_DATA}:C${cH},C${cH}))` },
      ]);
    }

    const wsJournal = XLSX.utils.aoa_to_sheet(journalData);
    wsJournal['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { hidden: true, wch: 20 }, { wch: 12 }];
    wsJournal['!freeze'] = { xSplit: 0, ySplit: JRNL_HDR };
    styleTable(wsJournal, JRNL_HDR, JRNL_DATA);
    XLSX.utils.book_append_sheet(wb, wsJournal, journalSheetName);

    // 3. DAFTAR AKUN
    const acctData: any[] = [
      [{ v: companyName, s: sTitle }, '', backBtn],
      [{ v: 'Daftar Akun Referensi', s: sSub }],
      [{ v: 'Nama akun WAJIB digunakan persis sama di Jurnal Umum & Input Tambahan.', s: sNote }],
      [],
      [{ v: 'Nama Akun', s: sHdr() }, { v: 'Tipe', s: sHdr() }, { v: 'Kategori', s: sHdr() }],
      ...CHART_OF_ACCOUNTS.map(a => [a.name, a.type, a.category]),
    ];
    const wsAcct = XLSX.utils.aoa_to_sheet(acctData);
    wsAcct['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 35 }];
    styleTable(wsAcct, 5, ACCT_DATA_START);
    XLSX.utils.book_append_sheet(wb, wsAcct, 'Daftar Akun');

    // 4. INPUT TAMBAHAN
    const cashList = CASH_ACCOUNTS.join(',');
    const inputData: any[] = [
      [{ v: companyName, s: sTitle }],
      [{ v: 'INPUT TAMBAHAN - Entri Transaksi Langsung di Excel', s: sSub }],
      [{ v: `Akun Kas: ${CASH_ACCOUNTS.join(', ')}`, s: sPer }],
      [{ v: 'PETUNJUK: Isi kolom B-M. Pilih Tipe, Akun Kas, dan Akun Lawan dari dropdown. Tiap baris otomatis menghasilkan 4 entri jurnal (Pendapatan + HPP).', s: sNote }],
      [{ v: 'TIP: Kolom N (Total HPP) dihitung otomatis via VLOOKUP ke Katalog Produk. Untuk layanan/non-produk, kosongkan kolom Produk.', s: sNote }],
      [],
      [
        { v: 'No', s: sHdr(true) },
        { v: 'Tanggal', s: sHdr() },
        { v: 'Deskripsi', s: sHdr() },
        { v: 'Tipe (cash-in/out)', s: sHdr(true) },
        { v: 'Akun Kas', s: sHdr() },
        { v: 'Akun Lawan / Kategori', s: sHdr() },
        { v: 'Nominal (Rp)', s: sHdr(true) },
        { v: 'Produk 1', s: sHdr() },
        { v: 'Qty 1', s: sHdr(true) },
        { v: 'Produk 2', s: sHdr() },
        { v: 'Qty 2', s: sHdr(true) },
        { v: 'Produk 3', s: sHdr() },
        { v: 'Qty 3', s: sHdr(true) },
        { v: 'Total HPP (Auto)', s: sGrnHdr() },
        { v: 'Validasi Akun', s: sHdr(true) },
      ],
    ];

    for (let i = 1; i <= MAX_INPUTS; i++) {
      const rn = INPUT_DATA + i - 1;
      inputData.push([
        { t: 'str', f: `IF(D${rn}="","",${i})`, s: sInp(true) },
        { t: 's', v: '', s: sInp() },
        { t: 's', v: '', s: sInp() },
        { t: 's', v: '', s: sInp(true) },
        { t: 's', v: '', s: sInp() },
        { t: 's', v: '', s: sInp() },
        { t: 'n', v: 0, z: nFmt, s: sInp(true) },
        { t: 's', v: '', s: sInp() },
        { t: 'n', v: 0, s: sInp(true) },
        { t: 's', v: '', s: sInp() },
        { t: 'n', v: 0, s: sInp(true) },
        { t: 's', v: '', s: sInp() },
        { t: 'n', v: 0, s: sInp(true) },
        {
          t: 'n', z: nFmt,
          f: `IF(D${rn}="cash-in",`
            + `IFERROR(IF(H${rn}<>"",VLOOKUP(H${rn},'Katalog Produk'!$A:$B,2,0)*IF(I${rn}>0,I${rn},0),0),0)`
            + `+IFERROR(IF(J${rn}<>"",VLOOKUP(J${rn},'Katalog Produk'!$A:$B,2,0)*IF(K${rn}>0,K${rn},0),0),0)`
            + `+IFERROR(IF(L${rn}<>"",VLOOKUP(L${rn},'Katalog Produk'!$A:$B,2,0)*IF(M${rn}>0,M${rn},0),0),0),0)`,
          s: sInp(true, true),
        },
        { t: 'str', f: `IF(F${rn}="","",IF(ISNUMBER(MATCH(F${rn},${acctRef},0)),"OK","Akun salah!"))`, s: sInp(true) },
      ]);
    }

    const wsInput = XLSX.utils.aoa_to_sheet(inputData);
    wsInput['!cols'] = [
      { wch: 5 }, { wch: 13 }, { wch: 30 }, { wch: 14 }, { wch: 20 },
      { wch: 28 }, { wch: 16 }, { wch: 25 }, { wch: 7 }, { wch: 25 },
      { wch: 7 }, { wch: 25 }, { wch: 7 }, { wch: 17 }, { wch: 16 },
    ];
    wsInput['!rows'] = Array.from({ length: 7 }, (_, i) => ({ hpt: i === 6 ? 30 : 18 }));
    const dEnd = INPUT_DATA + MAX_INPUTS - 1;
    wsInput['!dataValidation'] = [
      { sqref: `D${INPUT_DATA}:D${dEnd}`, type: 'list', formula1: '"cash-in,cash-out"', showDropDown: false },
      { sqref: `E${INPUT_DATA}:E${dEnd}`, type: 'list', formula1: `"${cashList}"`, showDropDown: false },
      { sqref: `F${INPUT_DATA}:F${dEnd}`, type: 'list', formula1: acctRef, showDropDown: false },
      ...(inventory.length > 0 ? [
        { sqref: `H${INPUT_DATA}:H${dEnd}`, type: 'list', formula1: katalogRef, showDropDown: false },
        { sqref: `J${INPUT_DATA}:J${dEnd}`, type: 'list', formula1: katalogRef, showDropDown: false },
        { sqref: `L${INPUT_DATA}:L${dEnd}`, type: 'list', formula1: katalogRef, showDropDown: false },
      ] : []),
    ];
    setUI(wsInput, true);
    XLSX.utils.book_append_sheet(wb, wsInput, 'Input Tambahan');

    // 5. LABA RUGI
    const incomeSheetName = 'Laba Rugi';
    const incData: any[] = [
      [{ v: companyName, s: sTitle }, '', backBtn],
      [{ v: 'Laporan Laba Rugi', s: sSub }],
      [{ v: periodString, s: sPer }],
      [],
    ];
    incData.push([{ v: 'Pendapatan', s: sBold }]);
    const revStart = incData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').forEach(acc => {
      incData.push([`  ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)`, z: nFmt }]);
    });
    const revEnd = incData.length;
    incData.push([{ v: 'Total Pendapatan', s: sBold }, { t: 'n', f: `SUM(B${revStart}:B${revEnd})`, z: nFmt, s: sBold }]);
    const totalRevRow = incData.length;
    incData.push([]);
    incData.push([{ v: 'Beban', s: sBold }]);
    const expStart = incData.length + 1;
    let r_Penyusutan = 0, r_Amortisasi = 0, r_HPP = 0;
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').forEach(acc => {
      const rn = incData.length + 1;
      if (acc.name === 'Beban Penyusutan') r_Penyusutan = rn;
      if (acc.name === 'Beban Amortisasi') r_Amortisasi = rn;
      if (acc.name === 'Harga Pokok Penjualan') r_HPP = rn;
      incData.push([`  ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)`, z: nFmt }]);
    });
    const expEnd = incData.length;
    incData.push([{ v: 'Total Beban', s: sBold }, { t: 'n', f: `SUM(B${expStart}:B${expEnd})`, z: nFmt, s: sBold }]);
    const totalExpRow = incData.length;
    incData.push([]);
    incData.push([{ v: 'LABA BERSIH', s: { font: fnt({ bold: true, sz: 11, color: { rgb: CLR.navy } }) } }, { t: 'n', f: `B${totalRevRow}-B${totalExpRow}`, z: nFmt, s: sBold }]);
    const netIncRow = incData.length;
    const wsIncome = XLSX.utils.aoa_to_sheet(incData);
    wsIncome['!cols'] = [{ wch: 42 }, { wch: 22 }, { wch: 12 }];
    setUI(wsIncome);
    XLSX.utils.book_append_sheet(wb, wsIncome, incomeSheetName);

    // 6. NERACA
    const balSheetName = 'Neraca';
    const balData: any[] = [
      [{ v: companyName, s: sTitle }, '', backBtn],
      [{ v: 'Neraca (Posisi Keuangan)', s: sSub }],
      [{ v: periodString, s: sPer }],
      [],
      [{ v: 'ASET', s: sBold }],
    ];
    const bsRows: Record<string, number> = {};
    const assetStart = balData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Assets').forEach(acc => {
      const rn = balData.length + 1; bsRows[acc.name] = rn;
      balData.push([`  ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)`, z: nFmt }]);
    });
    const assetEnd = balData.length;
    balData.push([{ v: 'Total Aset', s: sBold }, { t: 'n', f: `SUM(B${assetStart}:B${assetEnd})`, z: nFmt, s: sBold }]);
    const totalAssetRow = balData.length;
    balData.push([], [{ v: 'KEWAJIBAN & EKUITAS', s: sBold }], [{ v: '  Kewajiban', s: sBold }]);
    const liabStart = balData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Liabilities').forEach(acc => {
      const rn = balData.length + 1; bsRows[acc.name] = rn;
      balData.push([`    ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)`, z: nFmt }]);
    });
    const liabEnd = balData.length;
    balData.push([{ v: '  Ekuitas', s: sBold }]);
    const eqStart = balData.length + 1;
    const r_Modal = balData.length + 1; bsRows['Modal Pemilik'] = r_Modal;
    balData.push([`    Modal Pemilik`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!E:E)`, z: nFmt }]);
    const r_LabaDitahan = balData.length + 1; bsRows['Laba Ditahan'] = r_LabaDitahan;
    balData.push([`    Laba Ditahan`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!E:E)`, z: nFmt }]);
    balData.push([`    Laba Bersih (Periode Berjalan)`, { t: 'n', f: `'${incomeSheetName}'!B${netIncRow}`, z: nFmt }]);
    const r_Prive = balData.length + 1; bsRows['Prive'] = r_Prive;
    balData.push([`    Prive`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!F:F)`, z: nFmt }]);
    const liabSumF = liabStart > liabEnd ? '0' : `SUM(B${liabStart}:B${liabEnd})`;
    const eqSumF   = `B${eqStart}+B${eqStart+1}+B${eqStart+2}-B${eqStart+3}`;
    balData.push([{ v: 'Total Kewajiban & Ekuitas', s: sBold }, { t: 'n', f: `${liabSumF}+${eqSumF}`, z: nFmt, s: sBold }]);
    const totalLERow = balData.length;
    const wsBalance = XLSX.utils.aoa_to_sheet(balData);
    wsBalance['!cols'] = [{ wch: 42 }, { wch: 22 }, { wch: 12 }];
    setUI(wsBalance);
    XLSX.utils.book_append_sheet(wb, wsBalance, balSheetName);

    // 7. ARUS KAS
    const cashFlowName = 'Arus Kas';
    const cfData: any[] = [
      [{ v: companyName, s: sTitle }, '', backBtn],
      [{ v: 'Laporan Arus Kas (Indirect Method)', s: sSub }],
      [{ v: periodString, s: sPer }],
      [],
      [{ v: 'Aktivitas Operasi', s: sBold }],
      ['  Laba Bersih', { t: 'n', f: `'${incomeSheetName}'!B${netIncRow}`, z: nFmt }],
    ];
    if (r_Penyusutan) cfData.push(['  Penyesuaian Penyusutan', { t: 'n', f: `'${incomeSheetName}'!B${r_Penyusutan}`, z: nFmt }]);
    if (r_Amortisasi) cfData.push(['  Penyesuaian Amortisasi', { t: 'n', f: `'${incomeSheetName}'!B${r_Amortisasi}`, z: nFmt }]);
    CHART_OF_ACCOUNTS.filter(a => a.category === 'Current Assets' && !CASH_ACCOUNTS.includes(a.name)).forEach(acc => {
      const ref = bsRows[acc.name]; if (ref) cfData.push([`  Penurunan/(Kenaikan) ${acc.name}`, { t: 'n', f: `-'${balSheetName}'!B${ref}`, z: nFmt }]);
    });
    CHART_OF_ACCOUNTS.filter(a => a.category === 'Current Liabilities').forEach(acc => {
      const ref = bsRows[acc.name]; if (ref) cfData.push([`  Kenaikan/(Penurunan) ${acc.name}`, { t: 'n', f: `'${balSheetName}'!B${ref}`, z: nFmt }]);
    });
    const opEnd2 = cfData.length;
    cfData.push([{ v: 'Kas Bersih Aktivitas Operasi', s: sBold }, { t: 'n', f: `SUM(B6:B${opEnd2})`, z: nFmt, s: sBold }]);
    const opTotalRow = cfData.length;
    cfData.push([], [{ v: 'Aktivitas Investasi', s: sBold }]);
    const invStart2 = cfData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => ['Fixed Assets', 'Intangible Assets'].includes(a.category) && !a.name.startsWith('Akumulasi')).forEach(acc => {
      const ref = bsRows[acc.name]; if (ref) cfData.push([`  Pembelian/(Penjualan) ${acc.name}`, { t: 'n', f: `-'${balSheetName}'!B${ref}`, z: nFmt }]);
    });
    const invEnd2 = cfData.length;
    const invSumF2 = invStart2 > invEnd2 ? '0' : `SUM(B${invStart2}:B${invEnd2})`;
    cfData.push([{ v: 'Kas Bersih Aktivitas Investasi', s: sBold }, { t: 'n', f: invSumF2, z: nFmt, s: sBold }]);
    const invTotalRow = cfData.length;
    cfData.push([], [{ v: 'Aktivitas Pendanaan', s: sBold }]);
    const finStart2 = cfData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => a.category === 'Long-term Liabilities').forEach(acc => {
      const ref = bsRows[acc.name]; if (ref) cfData.push([`  Penerimaan/(Pelunasan) ${acc.name}`, { t: 'n', f: `'${balSheetName}'!B${ref}`, z: nFmt }]);
    });
    CHART_OF_ACCOUNTS.filter(a => a.category === 'Owner Equity').forEach(acc => {
      const ref = bsRows[acc.name];
      if (ref) cfData.push(acc.name === 'Prive'
        ? [`  (Penarikan Prive)`, { t: 'n', f: `-'${balSheetName}'!B${ref}`, z: nFmt }]
        : [`  Penambahan ${acc.name}`, { t: 'n', f: `'${balSheetName}'!B${ref}`, z: nFmt }]);
    });
    const finEnd2 = cfData.length;
    const finSumF2 = finStart2 > finEnd2 ? '0' : `SUM(B${finStart2}:B${finEnd2})`;
    cfData.push([{ v: 'Kas Bersih Aktivitas Pendanaan', s: sBold }, { t: 'n', f: finSumF2, z: nFmt, s: sBold }]);
    const finTotalRow = cfData.length;
    cfData.push([]);
    cfData.push([{ v: 'Kenaikan (Penurunan) Bersih Kas', s: sBold }, { t: 'n', f: `B${opTotalRow}+B${invTotalRow}+B${finTotalRow}`, z: nFmt, s: sBold }]);
    const netChangRow = cfData.length;
    cfData.push(['Saldo Kas & Bank Awal', { t: 'n', v: 0, z: nFmt }]);
    cfData.push([{ v: 'Saldo Kas & Bank Akhir', s: sBold }, { t: 'n', f: `B${netChangRow}+B${netChangRow+1}`, z: nFmt, s: sBold }]);
    const endCashRow = cfData.length;
    cfData.push(['[Cek ke Neraca]', {
      t: 'n', z: nFmt, s: sPer,
      f: CASH_ACCOUNTS.filter(n => bsRows[n]).map(n => `'${balSheetName}'!B${bsRows[n]}`).join('+') || '0',
    }]);
    const wsCF = XLSX.utils.aoa_to_sheet(cfData);
    wsCF['!cols'] = [{ wch: 46 }, { wch: 22 }, { wch: 12 }];
    setUI(wsCF);
    XLSX.utils.book_append_sheet(wb, wsCF, cashFlowName);

    // 8. BUKU BESAR
    CHART_OF_ACCOUNTS.forEach(accountInfo => {
      const sheetName = sanitizeSheetName(accountInfo.name);
      const ldData: any[] = [
        [{ v: companyName, s: sTitle }],
        [{ v: `Buku Besar: ${accountInfo.name}`, s: sSub }],
        [{ v: `Per Tanggal Cetak: ${today}`, s: sPer }],
        [],
        ['Tanggal', 'ID', 'Akun', 'Keterangan', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo (Rp)', backBtn],
      ];
      const wsLedger = XLSX.utils.aoa_to_sheet(ldData);
      for (let col = 0; col < 8; col++) {
        const ref = XLSX.utils.encode_cell({ r: 4, c: col });
        if (!wsLedger[ref]) wsLedger[ref] = { t: 's', v: '' };
        wsLedger[ref].s = sHdr(col >= 4);
      }
      const isDebitNormal = ['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive';
      const filteredEntries = reportData.generalJournal.journalEntries.filter(e => e.accountName === accountInfo.name);
      const maxRows = Math.max(500, filteredEntries.length + 100);
      let runningSaldo = 0;
      for (let i = 0; i < maxRows; i++) {
        const rowRef = 6 + i; const prevRef = rowRef - 1;
        const createCol = (col: string) =>
          `IFERROR(INDEX('${journalSheetName}'!${col}:${col},MATCH("${accountInfo.name}"&(ROW()-5),'${journalSheetName}'!H:H,0)),"")`;
        const saldoF = isDebitNormal
          ? (i === 0 ? `IF(A${rowRef}="","",E${rowRef}-F${rowRef})` : `IF(A${rowRef}="","",G${prevRef}+E${rowRef}-F${rowRef})`)
          : (i === 0 ? `IF(A${rowRef}="","",F${rowRef}-E${rowRef})` : `IF(A${rowRef}="","",G${prevRef}+F${rowRef}-E${rowRef})`);
        const entry = filteredEntries[i];
        let rowData: any[];
        if (entry) {
          const debit  = entry.entryType === 'Debit'  ? entry.amount : 0;
          const credit = entry.entryType === 'Credit' ? entry.amount : 0;
          runningSaldo += isDebitNormal ? (debit - credit) : (credit - debit);
          rowData = [
            { t: 's', v: format(new Date(entry.date), 'yyyy-MM-dd'), f: createCol('A') },
            { t: 's', v: entry.id, f: createCol('B') },
            { t: 's', v: entry.accountName, f: createCol('C') },
            { t: 's', v: entry.description, f: createCol('D') },
            { t: 'n', v: debit,  z: nFmt, f: createCol('E') },
            { t: 'n', v: credit, z: nFmt, f: createCol('F') },
            { t: 'n', v: runningSaldo, z: nFmt, f: saldoF },
          ];
        } else {
          rowData = [
            { f: createCol('A') }, { f: createCol('B') }, { f: createCol('C') }, { f: createCol('D') },
            { t: 'n', z: nFmt, f: createCol('E') }, { t: 'n', z: nFmt, f: createCol('F') },
            { t: 'n', z: nFmt, f: saldoF },
          ];
        }
        XLSX.utils.sheet_add_aoa(wsLedger, [rowData], { origin: `A${rowRef}` });
      }
      wsLedger['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
      setUI(wsLedger);
      XLSX.utils.book_append_sheet(wb, wsLedger, sheetName);
    });

    // 9. AUDIT & INVESTOR
    const auditData: any[] = [
      [{ v: companyName, s: sTitle }, '', '', '', backBtn],
      [{ v: 'Laporan Executive Audit & Investor Dashboard', s: sSub }],
      [{ v: periodString, s: sPer }],
      [],
      [{ v: 'Kesimpulan Analisis', s: sBold }, '', { v: 'Keterangan', s: sBold }],
      ['Status Kesehatan', { t: 'str', f: `IF(B12=0,"EMPTY",IF(B10<B17,"CRITICAL ALERT",IF(B19<0.15,"WARNING - MARGIN RENDAH",IF(AND(B26>0.20,B19>0.30),"KEUANGAN SANGAT PRIMA","SEHAT & PROFITABLE"))))` }, '-'],
      ['Deskripsi', { t: 'str', f: `IF(B12=0,"Belum ada data.",IF(B10<B17,"Perusahaan mengalami kerugian operasional.",IF(B19<0.15,"Berhasil melewati impas, namun margin rentan.",IF(AND(B26>0.20,B19>0.30),"ROI tinggi, margin aman. Risiko rendah.","Fundamental sehat. Berada aman di atas Titik Impas."))))` }, '-'],
      [],
      [{ v: 'Komponen Operasional', s: sBold }, '', 'Rumus'],
      ['Total Pendapatan', { t: 'n', f: `'${incomeSheetName}'!B${totalRevRow}`, z: nFmt }, 'Dari Laba Rugi'],
      ['Total Biaya Variabel (HPP)', { t: 'n', f: r_HPP ? `'${incomeSheetName}'!B${r_HPP}` : '0', z: nFmt }, 'Dari HPP'],
      ['Total Biaya Tetap', { t: 'n', f: `IF(B10>0,'${incomeSheetName}'!B${totalExpRow}-B11,0)`, z: nFmt }, 'Total Beban - HPP'],
      ['Margin Kontribusi', { t: 'n', f: `IF(B10>0,B10-B11,0)`, z: nFmt }, 'Pendapatan - HPP'],
      ['Rasio Margin Kontribusi', { t: 'n', f: `IF(B10>0,B13/B10,0)`, z: '0.00%' }, 'Margin / Pendapatan'],
      [],
      [{ v: 'Indikator BEP & Target', s: sBold }, '', 'Rumus'],
      ['Titik Impas / BEP (Rp)', { t: 'n', f: `IF(B14>0,B12/B14,0)`, z: nFmt }, 'Biaya Tetap / Rasio Margin'],
      ['Batas Aman / MoS (Rp)', { t: 'n', f: `IF(B10>0,B10-B17,0)`, z: nFmt }, 'Pendapatan - BEP'],
      ['Margin of Safety (%)', { t: 'n', f: `IF(B10>0,B18/B10,0)`, z: '0.00%' }, 'MoS / Pendapatan'],
      [],
      [{ v: 'Kinerja Investasi (ROI & ROA)', s: sBold }, '', 'Rumus'],
      ['Modal Pemilik', { t: 'n', f: `'${balSheetName}'!B${r_Modal}`, z: nFmt }, 'Modal Disetor'],
      ['Laba Ditahan', { t: 'n', f: `'${balSheetName}'!B${r_LabaDitahan}`, z: nFmt }, 'Laba Masa Lalu'],
      ['Total Ekuitas Penjamin', { t: 'n', f: 'B22+B23', z: nFmt }, 'Modal + Laba Ditahan'],
      ['Total Aset', { t: 'n', f: `'${balSheetName}'!B${totalAssetRow}`, z: nFmt }, 'Dari Neraca'],
      ['Laba Bersih', { t: 'n', f: `'${incomeSheetName}'!B${netIncRow}`, z: nFmt }, 'Dari Laba Rugi'],
      ['Return on Investment (ROI)', { t: 'n', f: 'IF(B24>0,B26/B24,0)', z: '0.00%' }, 'Laba / Total Ekuitas'],
      ['Return on Asset (ROA)', { t: 'n', f: 'IF(B25>0,B26/B25,0)', z: '0.00%' }, 'Laba / Total Aset'],
    ];
    const wsAudit = XLSX.utils.aoa_to_sheet(auditData);
    wsAudit['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 40 }];
    setUI(wsAudit);
    XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit & Investor');

    XLSX.writeFile(wb, 'Laporan Keuangan FinansiaProf.xlsx');
  };


  const handlePrintPDF = async () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const periodString = dateRange?.from 
      ? `Periode: ${format(dateRange.from, 'd MMM yyyy', {locale: id})} - ${dateRange.to ? format(dateRange.to, 'd MMM yyyy', {locale: id}) : 'Sekarang'}`
      : `Seluruh Waktu (Hingga ${today})`;
    const companyName = companyProfile.name;
    const totalPagesExp = '{total_pages_count_string}';
    const primaryColor = [36, 123, 160]; // Corresponds to #247BA0

    const addHeaderAndFooter = (data: any, title: string) => {
      // HEADER
      let textOffsetX = data.settings.margin.left;
      
      if (companyProfile.logoUrl) {
          try {
              const typeMatch = companyProfile.logoUrl.match(/^data:image\/(png|jpeg|jpg);/);
              const imgType = typeMatch ? (typeMatch[1] === 'jpg' ? 'JPEG' : typeMatch[1].toUpperCase()) : 'PNG';
              doc.addImage(companyProfile.logoUrl, imgType, data.settings.margin.left, 10, 16, 16);
              textOffsetX += 20; // Shift text right if logo is present
          } catch(e) {
              console.warn("Gagal menampilkan logo", e);
          }
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, textOffsetX, 16);
      
      doc.setFontSize(12);
      doc.text(title, textOffsetX, 22);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(periodString, textOffsetX, 28);

      // FOOTER
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      const footerText = `Halaman ${pageNumber}`;
      doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    };

    // --- Laporan Laba Rugi ---
    autoTable(doc, {
        startY: 40,
        margin: { top: 40 },
        head: [['Deskripsi', 'Jumlah']],
        body: [
            [{content: 'Pendapatan', styles: {fontStyle: 'bold'}}],
            ...Object.entries(reportData.incomeStatement.revenues).map(([cat, amt]) => [{content: `  ${cat}`, styles: {cellPadding: { top: 4, right: 4, bottom: 4, left: 10 }}}, {content: formatCurrency(amt), styles: {halign: 'right'}}]),
            [{content:'Total Pendapatan', styles: {fontStyle: 'bold'}}, {content: formatCurrency(reportData.incomeStatement.totalRevenue), styles: {halign: 'right', fontStyle: 'bold'}}],
            [{content: 'Beban', styles: {fontStyle: 'bold'}}],
            ...Object.entries(reportData.incomeStatement.expenses).map(([cat, amt]) => [{content: `  ${cat}`, styles: {cellPadding: { top: 4, right: 4, bottom: 4, left: 10 }}}, {content: formatCurrency(amt), styles: {halign: 'right'}}]),
            [{content:'Total Beban', styles: {fontStyle: 'bold'}}, {content: formatCurrency(reportData.incomeStatement.totalExpenses), styles: {halign: 'right', fontStyle: 'bold'}}],
        ],
        foot: [[{content:'Laba Bersih', styles: {fontStyle: 'bold'}}, {content: formatCurrency(reportData.incomeStatement.netIncome), styles: {halign: 'right', fontStyle: 'bold'}}]],
        theme: 'striped',
        styles: { valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Laporan Laba Rugi'),
    });
    
    // --- Neraca ---
    doc.addPage();
    const sortedAssetEntries = Object.entries(reportData.balanceSheet.assets).sort(([aName], [bName]) => {
      const aId = CHART_OF_ACCOUNTS.find(acc => acc.name === aName)?.id || '9999';
      const bId = CHART_OF_ACCOUNTS.find(acc => acc.name === bName)?.id || '9999';
      return aId.localeCompare(bId);
    });

    autoTable(doc, {
        startY: 40,
        margin: { top: 40 },
        head: [['Aset', '']],
        body: sortedAssetEntries.map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
        foot: [[{content:'Total Aset', styles:{fontStyle:'bold'}}, {content: formatCurrency(reportData.balanceSheet.totalAssets), styles: {halign: 'right', fontStyle:'bold'}}]],
        theme: 'striped',
        styles: { valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Neraca'),
    });

     autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        margin: { top: 40 },
        head: [['Kewajiban dan Ekuitas', '']],
        body: [
            ...Object.entries(reportData.balanceSheet.liabilities).map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
            ...Object.entries(reportData.balanceSheet.equity).map(([name, amount]) => [name, {content: name === 'Prive' ? `(${formatCurrency(Math.abs(amount as number))})` : formatCurrency(amount as number), styles: {halign: 'right'}}]),
        ],
        foot: [[{content:'Total Kewajiban dan Ekuitas', styles:{fontStyle:'bold'}}, {content: formatCurrency(reportData.balanceSheet.totalLiabilitiesAndEquity), styles: {halign: 'right', fontStyle:'bold'}}]],
        theme: 'striped',
        styles: { valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Neraca'),
    });

    // --- Jurnal Umum ---
    doc.addPage();
    const groupedEntries = reportData.generalJournal.journalEntries.reduce((acc, entry) => {
        const key = entry.id.replace('-cogs', '');
        (acc[key] = acc[key] || []).push(entry);
        return acc;
    }, {} as Record<string, any[]>);

     autoTable(doc, {
        startY: 40,
        margin: { top: 40 },
        head: [['Tanggal', 'Akun & Keterangan', 'Debit', 'Kredit']],
        body: Object.values(groupedEntries).flatMap(entries => {
          const rows: any[] = [];
          const firstEntry = entries[0];
          const mainEntries = entries.filter(e => !e.id.includes('-cogs'));
          const cogsEntries = entries.filter(e => e.id.includes('-cogs'));

          mainEntries.forEach((entry, index) => {
             rows.push([
                index === 0 ? format(new Date(entry.date), 'd MMM y', { locale: id }) : '',
                { content: entry.accountName, styles: { cellPadding: { top: 4, right: 4, bottom: 4, left: entry.entryType === 'Credit' ? 12 : 4 }}},
                { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } }
             ]);
          });
          rows.push(['', {content: `(${firstEntry.description})`, colSpan: 3, styles: {textColor: [150, 150, 150], fontStyle: 'italic', cellPadding: { top: 4, right: 4, bottom: 4, left: 12 }}}]);
          
           if (cogsEntries.length > 0) {
                cogsEntries.forEach((entry) => {
                    rows.push([
                        '',
                        { content: entry.accountName, styles: { cellPadding: { top: 4, right: 4, bottom: 4, left: entry.entryType === 'Credit' ? 12 : 4 }}},
                        { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                        { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } }
                    ]);
                });
                rows.push(['', {content: `(Mencatat HPP untuk penjualan)`, colSpan: 3, styles: {textColor: [150, 150, 150], fontStyle: 'italic', cellPadding: { top: 4, right: 4, bottom: 4, left: 12 }}}]);
           }

          return rows;
        }),
        theme: 'striped',
        styles: { valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Jurnal Umum'),
    });

     // --- Laporan Arus Kas ---
    doc.addPage();
    autoTable(doc, {
        startY: 40,
        margin: { top: 40 },
        head: [['Deskripsi', 'Jumlah']],
        body: [
          [{ content: 'Aktivitas Operasi', styles: { fontStyle: 'bold' } }, ''],
          ...reportData.cashFlow.operatingFlows.map(flow => [{ content: `  ${flow.name}`, styles: { cellPadding: { top: 4, right: 4, bottom: 4, left: 10 } } }, { content: flow.amount < 0 ? `(${formatCurrency(Math.abs(flow.amount))})` : formatCurrency(flow.amount), styles: { halign: 'right' } }]),
          [{ content: 'Total Arus Kas dari Aktivitas Operasi', styles: { fontStyle: 'bold' } }, { content: reportData.cashFlow.totalOperating < 0 ? `(${formatCurrency(Math.abs(reportData.cashFlow.totalOperating))})` : formatCurrency(reportData.cashFlow.totalOperating), styles: { halign: 'right', fontStyle: 'bold' } }],
        ],
        foot: [
          ['Saldo Kas Awal', { content: formatCurrency(reportData.cashFlow.beginningCash), styles: { halign: 'right' } }],
          ['Saldo Kas Akhir', { content: formatCurrency(reportData.cashFlow.endingCash), styles: { halign: 'right', fontStyle: 'bold' } }]
        ],
        theme: 'striped',
        styles: { valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        footStyles: { fontStyle: 'bold', valign: 'middle' },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Laporan Arus Kas'),
    });

     // --- Buku Besar ---
    reportData.generalLedger.sortedLedgerAccounts.forEach(account => {
        if (account.entries.length === 0) return;
        doc.addPage();
         autoTable(doc, {
            startY: 40,
            margin: { top: 40 },
            theme: 'striped',
            styles: { valign: 'middle' },
            headStyles: { fillColor: primaryColor, valign: 'middle' },
            head: [['Tanggal', 'Keterangan', 'Debit', 'Kredit', 'Saldo']],
            body: account.entries.map((entry: any) => [
                format(new Date(entry.date), 'd MMM y', { locale: id }),
                entry.description,
                { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                { content: formatCurrency(entry.balance), styles: { halign: 'right' } },
            ]),
            foot: [
                [
                    { content: 'Saldo Akhir', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: formatCurrency(account.balance), styles: { halign: 'right', fontStyle: 'bold' } }
                ]
            ],
            didDrawPage: (data) => addHeaderAndFooter(data, `Buku Besar: ${account.accountInfo.name}`),
        });
    });

    // --- Laporan Audit & Investor ---
    doc.addPage();
    const variableCostsPDF = reportData.incomeStatement.expenses['Harga Pokok Penjualan'] || 0;
    let fixedCostsPDF = 0;
    Object.entries(reportData.incomeStatement.expenses).forEach(([name, amt]) => {
        if (name !== 'Harga Pokok Penjualan') fixedCostsPDF += (amt as number);
    });
    const contributionMarginRatioPDF = reportData.incomeStatement.totalRevenue > 0 ? ((reportData.incomeStatement.totalRevenue - variableCostsPDF) / reportData.incomeStatement.totalRevenue) : 0;
    const bepRupiahPDF = contributionMarginRatioPDF > 0 ? (fixedCostsPDF / contributionMarginRatioPDF) : 0;
    const marginOfSafetyPercentPDF = reportData.incomeStatement.totalRevenue > 0 ? ((reportData.incomeStatement.totalRevenue - bepRupiahPDF) / reportData.incomeStatement.totalRevenue) * 100 : 0;
    const totalEquityPDF = (reportData.balanceSheet.equity['Modal Pemilik'] || 0) + (reportData.balanceSheet.equity['Laba Ditahan'] || 0);
    const roiPDF = totalEquityPDF > 0 ? (reportData.incomeStatement.netIncome / totalEquityPDF) * 100 : 0;
    const roaPDF = reportData.balanceSheet.totalAssets > 0 ? (reportData.incomeStatement.netIncome / reportData.balanceSheet.totalAssets) * 100 : 0;
    
    let healthStateTitlePDF = '';
    let healthStateDescPDF = '';
    const totalCostsPDF = fixedCostsPDF + variableCostsPDF;
    if (reportData.incomeStatement.totalRevenue === 0 && totalCostsPDF === 0) { healthStateTitlePDF = 'EMPTY'; healthStateDescPDF = 'Belum ada data operasional.'; }
    else if (reportData.incomeStatement.totalRevenue < bepRupiahPDF) { healthStateTitlePDF = 'CRITICAL ALERT (REVENUE UNDER BEP)'; healthStateDescPDF = 'Perusahaan kerugian operasional dan belum mencapai Titik Impas (BEP).'; }
    else if (marginOfSafetyPercentPDF < 15) { healthStateTitlePDF = 'WARNING (MARGIN OF SAFETY RENDAH)'; healthStateDescPDF = 'Berhasil melewati level impas, namun berada rentan (Margin < 15%).'; }
    else if (roiPDF > 20 && marginOfSafetyPercentPDF > 30) { healthStateTitlePDF = 'KEUANGAN SANGAT PRIMA (HIGH ROI)'; healthStateDescPDF = 'ROI tinggi, margin of safety kokoh. Momentum baik untuk ekspansi.'; }
    else { healthStateTitlePDF = 'SEHAT & PROFITABLE'; healthStateDescPDF = 'Fundamental sehat. Beban dapat ditutup dengan baik.'; }

    autoTable(doc, {
        startY: 40,
        margin: { top: 40 },
        head: [['Indikator Executive Audit & Investor', 'Nilai/Rasio']],
        body: [
            ['[KESIMPULAN METRIK KESEHATAN]', healthStateTitlePDF],
            ['[DESKRIPSI]', healthStateDescPDF],
            ['', ''],
            ['Titik Impas / BEP', { content: formatCurrency(bepRupiahPDF), styles: { halign: 'right' } }],
            ['Batas Aman / Margin of Safety', { content: `${marginOfSafetyPercentPDF.toFixed(2)} %`, styles: { halign: 'right' } }],
            ['Total Biaya Tetap Operasional', { content: formatCurrency(fixedCostsPDF), styles: { halign: 'right' } }],
            ['Rasio Margin Kontribusi', { content: `${(contributionMarginRatioPDF * 100).toFixed(2)} %`, styles: { halign: 'right' } }],
            ['Return on Investment (ROI)', { content: `${roiPDF.toFixed(2)} %`, styles: { halign: 'right' } }],
            ['Return on Asset (ROA)', { content: `${roaPDF.toFixed(2)} %`, styles: { halign: 'right' } }]
        ],
        theme: 'striped',
        styles: { cellPadding: 4, valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 70 } },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Audit & Investor Executive Dashboard'),
    });

    // Check if the dashboard is currently rendered in the UI to screenshot the graph
    const chartRenderEl = document.getElementById('advanced-bep-roi-container');
    if (chartRenderEl) {
        try {
            const canvas = await html2canvas(chartRenderEl, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            // AutoTable finished, get its final Y
            const finalY = (doc as any).lastAutoTable.finalY + 15;
            const pdfWidth = doc.internal.pageSize.getWidth() - 28; // Margins
            const imgRatio = canvas.height / canvas.width;
            let imgHeight = pdfWidth * imgRatio;
            
            // Add to new page if it won't fit entirely
            if (finalY + imgHeight > doc.internal.pageSize.getHeight() - 20) {
               doc.addPage();
               doc.addImage(imgData, 'PNG', 14, 20, pdfWidth, imgHeight);
               addHeaderAndFooter({pageNumber: doc.getNumberOfPages()}, 'Visualisasi Grafik Audit');
            } else {
               doc.addImage(imgData, 'PNG', 14, finalY, pdfWidth, imgHeight);
            }
        } catch (e) {
            console.error("Failed to capture chart: ", e);
        }
    }

    // Replace page number placeholder
    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages(totalPagesExp);
    }

    doc.save('Laporan Keuangan FinansiaProf.pdf');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Laporan Keuangan"
        description="Hasilkan dan lihat laporan keuangan bisnis Anda."
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 border rounded-md p-1 bg-muted/20">
            <Select value={quickMonth} onValueChange={setQuickMonth}>
              <SelectTrigger className="w-[120px] h-9 border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Januari</SelectItem>
                <SelectItem value="2">Februari</SelectItem>
                <SelectItem value="3">Maret</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">Mei</SelectItem>
                <SelectItem value="6">Juni</SelectItem>
                <SelectItem value="7">Juli</SelectItem>
                <SelectItem value="8">Agustus</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">Oktober</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">Desember</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quickYear} onValueChange={setQuickYear}>
              <SelectTrigger className="w-[100px] h-9 border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleQuickSelect} className="h-8">Terapkan</Button>
          </div>
          <span className="text-muted-foreground text-sm px-2">atau</span>
          <DatePickerWithRange />
          <Button variant="outline" className="border-blue-600/30 text-blue-700 hover:bg-blue-50" onClick={() => setIsShareOpen(true)}>
            <Send className="mr-2 h-4 w-4" />
            Kirim Laporan
          </Button>
          <Button variant="outline" onClick={handleExportXLSX}>
            <Download className="mr-2 h-4 w-4" />
            Ekspor Semua (XLSX)
          </Button>
          <Button variant="outline" onClick={handlePrintPDF}>
            <Printer className="mr-2 h-4 w-4" />
            Cetak Semua (PDF)
          </Button>
        </div>
      </PageHeader>
      
      <Tabs defaultValue="income-statement">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-4 h-auto gap-1">
            <TabsTrigger value="income-statement" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20">Laporan Laba Rugi</TabsTrigger>
            <TabsTrigger value="balance-sheet" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20">Neraca</TabsTrigger>
            <TabsTrigger value="general-journal" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20">Jurnal Umum</TabsTrigger>
            <TabsTrigger value="cash-flow" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20">Arus Kas</TabsTrigger>
            <TabsTrigger value="general-ledger" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20">Buku Besar</TabsTrigger>
            <TabsTrigger value="audit-investor" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20">Audit & Investor</TabsTrigger>
        </TabsList>
        <TabsContent value="income-statement">
            <IncomeStatement data={reportData.incomeStatement} />
        </TabsContent>
        <TabsContent value="balance-sheet">
            <BalanceSheet data={reportData.balanceSheet} />
        </TabsContent>
        <TabsContent value="general-journal">
            <GeneralJournal data={reportData.generalJournal} />
        </TabsContent>
        <TabsContent value="cash-flow">
            <CashFlowStatement data={reportData.cashFlow} />
        </TabsContent>
        <TabsContent value="general-ledger">
            <GeneralLedger data={reportData.generalLedger} />
        </TabsContent>
        <TabsContent value="audit-investor">
            <AdvancedBEPROIAnalysis reportData={reportData} />
        </TabsContent>
      </Tabs>

      <ShareReportDialog 
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        type="financial"
        data={{
          labaRugi: reportData.incomeStatement,
          neraca: reportData.balanceSheet,
          arusKas: reportData.cashFlow
        }}
        onDownloadXLSX={handleExportXLSX}
        onDownloadPDF={handlePrintPDF}
      />
    </div>
  );
}
