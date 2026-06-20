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
import { useMemo } from 'react';
import { CASH_ACCOUNTS, CHART_OF_ACCOUNTS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReportsPage() {
  const { transactions, inventory, companyProfile, dateRange, setDateRange, accounts } = useAppState();
  const activeAccounts = accounts && accounts.length > 0 ? accounts : CHART_OF_ACCOUNTS;
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
    const extendedCOA = [...activeAccounts];
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

    const allCashAccounts = new Set([...CASH_ACCOUNTS, ...extendedCOA.filter(a => !activeAccounts.some(ca => ca.name === a.name)).map(a => a.name)]);

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
  }, [transactions, inventory, companyProfile.name, dateRange, activeAccounts]);

  const handleExportXLSX = async () => {
    try {
      const EXL = await import('exceljs');
      const ExcelJS = (EXL as any).default || EXL;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'FinansiaProf';
      workbook.created = new Date();

      const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      const periodString = dateRange?.from
        ? `Periode: ${format(dateRange.from, 'd MMM yyyy', { locale: id })} - ${dateRange.to ? format(dateRange.to, 'd MMM yyyy', { locale: id }) : 'Sekarang'}`
        : `Seluruh Waktu (Hingga ${today})`;
      const companyName = companyProfile.name;
      const journalSheetName = 'Jurnal Umum';
      const sanitizeSheetName = (n: string) => n.replace(/[\\/*?[\]:]/g, '').substring(0, 31);

      // ── COLORS (ARGB = Alpha + R + G + B) ──────────────────────────
      const C = {
        navy:       'FF1E3A5F',
        blue:       'FF247BA0',
        blueMid:    'FFD0E8F5',
        blueLight:  'FFEBF4FA',
        yellow:     'FFFFFDE7',
        greenLight: 'FFE8F5E9',
        greenHdr:   'FF1B6B38',
        white:      'FFFFFFFF',
        textGray:   'FF6B7280',
        border:     'FFB8D4E8',
      };

      const bThin = (a = C.border) => ({ style: 'thin' as const, color: { argb: a } });
      const bMed  = (a = C.blue)   => ({ style: 'medium' as const, color: { argb: a } });
      const bAll  = { top: bThin(), bottom: bThin(), left: bThin(), right: bThin() };
      const bMedTB = { top: bMed(), bottom: bMed(), left: bThin(), right: bThin() };
      const nFmt  = '#,##0;(#,##0);"-"';

      const styleHdr = (cell: any, center = false) => {
        cell.font      = { name: 'Calibri', bold: true, size: 10, color: { argb: C.white } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
        cell.border    = bAll;
        cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: true };
      };
      const styleGrnHdr = (cell: any) => {
        cell.font      = { name: 'Calibri', bold: true, size: 10, color: { argb: C.white } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.greenHdr } };
        cell.border    = bAll;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      };
      const styleData = (cell: any, alt = false, right = false, wrap = false) => {
        cell.font      = { name: 'Calibri', size: 10 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? C.blueLight : C.white } };
        cell.border    = bAll;
        cell.alignment = { horizontal: right ? 'right' : 'left', vertical: 'middle', wrapText: wrap };
      };
      const styleTotal = (cell: any, right = false) => {
        cell.font      = { name: 'Calibri', bold: true, size: 10, color: { argb: C.navy } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blueMid } };
        cell.border    = bMedTB;
        cell.alignment = { horizontal: right ? 'right' : 'left', vertical: 'middle' };
      };
      const styleInput = (cell: any, right = false, green = false) => {
        cell.font      = { name: 'Calibri', size: 10 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: green ? C.greenLight : C.yellow } };
        cell.border    = bAll;
        cell.alignment = { horizontal: right ? 'right' : 'left', vertical: 'middle', wrapText: !right };
      };
      const styleMenuBtn = (cell: any, targetSheet: string) => {
        cell.value     = { text: '↩ MENU', hyperlink: `#'DAFTAR ISI'!A1` };
        cell.font      = { name: 'Calibri', bold: true, size: 9, color: { argb: C.white } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      };

      const setupPage = (sheet: any, landscape = false) => {
        sheet.views = [{ showGridLines: false, zoomScale: 100 }];
        sheet.pageSetup.paperSize    = 9; // A4
        sheet.pageSetup.orientation  = landscape ? 'landscape' : 'portrait';
        sheet.pageSetup.fitToPage    = true;
        sheet.pageSetup.fitToWidth   = 1;
        sheet.pageSetup.fitToHeight  = 0;
        sheet.pageSetup.margins      = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
      };

      const fv = (formula: string, result: any = 0) => ({ formula, result });

      // Account reference (Daftar Akun data starts row 6)
      const ACCT_DATA_START = 6;
      const acctRef = `'Daftar Akun'!$B$${ACCT_DATA_START}:$B$${ACCT_DATA_START + activeAccounts.length}`;

      // Katalog Produk data starts row 7
      const KATALOG_DATA_START = 7;
      const katalogRef = inventory.length > 0
        ? `'Katalog Produk'!$A$${KATALOG_DATA_START}:$A$${KATALOG_DATA_START + inventory.length - 1}`
        : '"---"';

      // Journal rows
      const JRNL_DATA  = 6;
      const INPUT_DATA = 8;   // Input Tambahan data starts row 8
      const MAX_INPUTS = 200;

      // ═══════════════════════════════════════════════════════════
      // 0. DAFTAR ISI
      // ═══════════════════════════════════════════════════════════
      const tocSheet = workbook.addWorksheet('DAFTAR ISI');
      setupPage(tocSheet);
      tocSheet.pageSetup.printArea = 'A1:B60';
      tocSheet.columns = [{ width: 5 }, { width: 65 }];

      const tR = (label: string, sz = 10, bold = false, navy = false, italic = false) => {
        const r = tocSheet.addRow(['', label]); r.height = sz > 10 ? sz + 8 : 15;
        r.getCell(2).font = { name: 'Calibri', size: sz, bold, italic, color: { argb: navy ? C.navy : bold ? C.blue : C.textGray } };
        return r;
      };
      const tL = (label: string, target: string) => {
        const r = tocSheet.addRow(['    ', label]); r.height = 15;
        r.getCell(2).value = { text: label, hyperlink: `#'${target}'!A1` };
        r.getCell(2).font  = { name: 'Calibri', size: 10, color: { argb: C.blue }, underline: true };
        return r;
      };
      tR('LAPORAN KEUANGAN', 16, true, true); tR(companyName, 13, true, true); tR(periodString, 10, false, false, true); tR(`Dicetak: ${today}`, 9, false, false, true);
      tR(''); { const r = tocSheet.addRow(['', 'DAFTAR ISI — Klik link di bawah untuk berpindah ke sheet:']); r.height = 18; r.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.navy } }; } tR('');
      tR('1.  ENTRI & REFERENSI', 11, true);
      tL('    Input Tambahan (Entri Transaksi)', 'Input Tambahan');
      tL('    Jurnal Umum', journalSheetName);
      tL('    Katalog Produk & HPP', 'Katalog Produk');
      tL('    Daftar Akun (Referensi)', 'Daftar Akun');
      tR('');
      tR('2.  LAPORAN UTAMA', 11, true);
      tL('    Laporan Laba Rugi', 'Laba Rugi');
      tL('    Neraca (Posisi Keuangan)', 'Neraca');
      tL('    Laporan Arus Kas', 'Arus Kas');
      tR('');
      tR('3.  ANALISIS KHUSUS', 11, true);
      tL('    Audit & Investor Dashboard', 'Audit & Investor');
      tR('');
      tR('4.  BUKU BESAR (PER AKUN)', 11, true);
      activeAccounts.forEach(acc => tL(`    ${acc.name}`, sanitizeSheetName(acc.name)));

      // ═══════════════════════════════════════════════════════════
      // 1. INPUT TAMBAHAN
      // ═══════════════════════════════════════════════════════════
      const inputSheet = workbook.addWorksheet('Input Tambahan');
      setupPage(inputSheet, true);
      inputSheet.columns = [
        { width: 5 }, { width: 13 }, { width: 30 }, { width: 14 }, { width: 20 }, { width: 28 },
        { width: 16 }, { width: 25 }, { width: 7 }, { width: 25 }, { width: 7 }, { width: 25 },
        { width: 7 }, { width: 17 }, { width: 16 },
        { width: 12 }, // Col P: MENU button — outside print area
      ];
      // Info rows 1-6
      { const r = inputSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = inputSheet.addRow(['INPUT TAMBAHAN — Entri Transaksi Langsung di Excel']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = inputSheet.addRow([`Akun Kas: ${CASH_ACCOUNTS.join(', ')}`]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const r = inputSheet.addRow(['PETUNJUK: Isi kolom B-M. Pilih Tipe, Akun Kas, dan Akun Lawan dari dropdown. Tiap baris otomatis menghasilkan 4 entri jurnal (Pendapatan + HPP).']); r.height = 20; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; r.getCell(1).alignment = { wrapText: true }; }
      { const r = inputSheet.addRow(['TIP: Kolom N (Total HPP) dihitung otomatis via VLOOKUP ke Katalog Produk. Untuk layanan/non-produk, kosongkan kolom H-M.']); r.height = 20; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; r.getCell(1).alignment = { wrapText: true }; }
      inputSheet.addRow([]);
      // Table header (row 7)
      { const r = inputSheet.addRow(['No', 'Tanggal *', 'Deskripsi *', 'Tipe *', 'Akun Kas *', 'Akun Lawan / Kategori *', 'Nominal * (Rp)', 'Produk 1', 'Qty 1', 'Produk 2', 'Qty 2', 'Produk 3', 'Qty 3', 'Total HPP\n(Auto)', 'Validasi\nAkun', '↩ MENU']); r.height = 32;
        [1,2,3,4,5,6,7,8,9,10,11,12,13,15].forEach(c => styleHdr(r.getCell(c), c !== 2 && c !== 3 && c !== 5 && c !== 6 && c !== 8 && c !== 10 && c !== 12));
        styleGrnHdr(r.getCell(14));
        styleMenuBtn(r.getCell(16), 'DAFTAR ISI'); }
      // Data rows (row 8 = INPUT_DATA onwards)
      const dEnd = INPUT_DATA + MAX_INPUTS - 1;
      for (let i = 1; i <= MAX_INPUTS; i++) {
        const rn = INPUT_DATA + i - 1;
        const r = inputSheet.addRow(new Array(16).fill('')); r.height = 20;
        r.getCell(1).value = fv(`IF(D${rn}="","",${i})`, ''); styleInput(r.getCell(1), true);
        r.getCell(2).value = ''; styleInput(r.getCell(2));
        r.getCell(3).value = ''; styleInput(r.getCell(3));
        r.getCell(4).value = ''; styleInput(r.getCell(4), true);
        r.getCell(5).value = ''; styleInput(r.getCell(5));
        r.getCell(6).value = ''; styleInput(r.getCell(6));
        r.getCell(7).value = 0; r.getCell(7).numFmt = nFmt; styleInput(r.getCell(7), true);
        [8, 10, 12].forEach(c => { r.getCell(c).value = ''; styleInput(r.getCell(c)); });
        [9, 11, 13].forEach(c => { r.getCell(c).value = 0; styleInput(r.getCell(c), true); });
        r.getCell(14).value = fv(
          `IF(D${rn}="cash-in",`
          + `IFERROR(IF(H${rn}<>"",VLOOKUP(H${rn},'Katalog Produk'!$A:$B,2,0)*IF(I${rn}>0,I${rn},0),0),0)`
          + `+IFERROR(IF(J${rn}<>"",VLOOKUP(J${rn},'Katalog Produk'!$A:$B,2,0)*IF(K${rn}>0,K${rn},0),0),0)`
          + `+IFERROR(IF(L${rn}<>"",VLOOKUP(L${rn},'Katalog Produk'!$A:$B,2,0)*IF(M${rn}>0,M${rn},0),0),0),0)`, 0);
        r.getCell(14).numFmt = nFmt; styleInput(r.getCell(14), true, true);
        r.getCell(15).value = fv(`IF(F${rn}="","",IF(ISNUMBER(MATCH(F${rn},${acctRef},0)),"OK","Akun salah!"))`, ''); styleInput(r.getCell(15), true);
      }
      // Data Validations — WORKS properly in ExcelJS!
      inputSheet.dataValidations.add(`D${INPUT_DATA}:D${dEnd}`, { type: 'list', allowBlank: true, formulae: ['"cash-in,cash-out"'] });
      inputSheet.dataValidations.add(`E${INPUT_DATA}:E${dEnd}`, { type: 'list', allowBlank: true, formulae: [`"${CASH_ACCOUNTS.join(',')}"`] });
      inputSheet.dataValidations.add(`F${INPUT_DATA}:F${dEnd}`, { type: 'list', allowBlank: true, formulae: [acctRef] });
      if (inventory.length > 0) {
        inputSheet.dataValidations.add(`H${INPUT_DATA}:H${dEnd}`, { type: 'list', allowBlank: true, formulae: [katalogRef] });
        inputSheet.dataValidations.add(`J${INPUT_DATA}:J${dEnd}`, { type: 'list', allowBlank: true, formulae: [katalogRef] });
        inputSheet.dataValidations.add(`L${INPUT_DATA}:L${dEnd}`, { type: 'list', allowBlank: true, formulae: [katalogRef] });
      }
      inputSheet.pageSetup.printArea = `A1:O${dEnd + 1}`; // col P (MENU) excluded

      // ═══════════════════════════════════════════════════════════
      // 2. JURNAL UMUM
      // ═══════════════════════════════════════════════════════════
      const jrnlSheet = workbook.addWorksheet(journalSheetName);
      setupPage(jrnlSheet);
      jrnlSheet.columns = [
        { width: 12 }, { width: 15 }, { width: 30 }, { width: 42 },
        { width: 16 }, { width: 16 }, { width: 18 },
        { width: 0.1, hidden: true }, // H: HelperBB
        { width: 12 },               // I: MENU button (outside print)
      ];
      { const r = jrnlSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = jrnlSheet.addRow(['Jurnal Umum']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = jrnlSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      jrnlSheet.addRow([]);
      { const r = jrnlSheet.addRow(['Tanggal', 'ID Transaksi', 'Nama Akun', 'Keterangan / Deskripsi', 'Debit (Rp)', 'Kredit (Rp)', 'Cek Akun', 'HelperBB', '↩ MENU']); r.height = 24;
        [1,2,3,4].forEach(c => styleHdr(r.getCell(c))); [5,6,7].forEach(c => styleHdr(r.getCell(c), true));
        r.getCell(8).font = { name: 'Calibri', size: 7, color: { argb: C.textGray } };
        styleMenuBtn(r.getCell(9), 'DAFTAR ISI'); }
      jrnlSheet.views = [{ state: 'frozen', ySplit: 5, showGridLines: false, zoomScale: 100 }];

      let helperCnt: Record<string, number> = {};
      reportData.generalJournal.journalEntries.forEach((entry, idx) => {
        const row = JRNL_DATA + idx;
        const akun = entry.accountName;
        helperCnt[akun] = (helperCnt[akun] || 0) + 1;
        const r = jrnlSheet.addRow([format(new Date(entry.date), 'yyyy-MM-dd'), entry.id, akun, entry.description,
          entry.entryType === 'Debit' ? entry.amount : 0, entry.entryType === 'Credit' ? entry.amount : 0, '', '']);
        r.height = 18; const alt = idx % 2 === 1;
        styleData(r.getCell(1), alt); styleData(r.getCell(2), alt); styleData(r.getCell(3), alt, false, true); styleData(r.getCell(4), alt, false, true);
        styleData(r.getCell(5), alt, true); r.getCell(5).numFmt = nFmt;
        styleData(r.getCell(6), alt, true); r.getCell(6).numFmt = nFmt;
        r.getCell(7).value = fv(`IF(C${row}="","",IF(ISNUMBER(MATCH(C${row},${acctRef},0)),"OK","CEK AKUN!"))`, ''); styleData(r.getCell(7), alt, true);
        r.getCell(8).value = fv(`IF(C${row}="","",C${row}&COUNTIF($C$${JRNL_DATA}:C${row},C${row}))`, `${akun}${helperCnt[akun]}`);
      });

      const BLANK_JRNL = JRNL_DATA + reportData.generalJournal.journalEntries.length;
      for (let i = 0; i < 500; i++) {
        const row = BLANK_JRNL + i; const alt = i % 2 === 1;
        const r = jrnlSheet.addRow(['', '', '', '', 0, 0, '', '']); r.height = 18;
        styleData(r.getCell(1), alt); styleData(r.getCell(2), alt); styleData(r.getCell(3), alt, false, true); styleData(r.getCell(4), alt, false, true);
        styleData(r.getCell(5), alt, true); r.getCell(5).numFmt = nFmt;
        styleData(r.getCell(6), alt, true); r.getCell(6).numFmt = nFmt;
        r.getCell(7).value = fv(`IF(C${row}="","",IF(ISNUMBER(MATCH(C${row},${acctRef},0)),"OK","CEK AKUN!"))`, ''); styleData(r.getCell(7), alt, true);
        r.getCell(8).value = fv(`IF(C${row}="","",C${row}&COUNTIF($C$${JRNL_DATA}:C${row},C${row}))`, '');
      }

      const INPUT_JRNL_START = BLANK_JRNL + 500;
      for (let i = 1; i <= MAX_INPUTS; i++) {
        const IR  = INPUT_DATA + i - 1;
        const dR  = INPUT_JRNL_START + (i - 1) * 4;
        const cR  = dR + 1; const dH = dR + 2; const cH = dR + 3;
        const has   = `'Input Tambahan'!D${IR}<>""`;
        const isCI  = `'Input Tambahan'!D${IR}="cash-in"`;
        const hasHP = `AND(${has},${isCI},'Input Tambahan'!N${IR}>0)`;
        const pad   = String(i).padStart(3, '0');
        const addJRow = (dateF: string, idF: string, akunF: string, descF: string, debitF: string|null, kreditF: string|null, row: number) => {
          const r = jrnlSheet.addRow(['','','','',0,0,'','']); r.height = 14;
          r.getCell(1).value = fv(dateF, ''); r.getCell(2).value = fv(idF, '');
          r.getCell(3).value = fv(akunF, ''); r.getCell(4).value = fv(descF, '');
          r.getCell(5).value = debitF ? fv(debitF, 0) : 0; r.getCell(5).numFmt = nFmt;
          r.getCell(6).value = kreditF ? fv(kreditF, 0) : 0; r.getCell(6).numFmt = nFmt;
          r.getCell(7).value = fv(`IF(C${row}="","",IF(ISNUMBER(MATCH(C${row},${acctRef},0)),"OK","CEK AKUN!"))`, '');
          r.getCell(8).value = fv(`IF(C${row}="","",C${row}&COUNTIF($C$${JRNL_DATA}:C${row},C${row}))`, '');
          [1,2,3,4,7].forEach(c => styleData(r.getCell(c))); [5,6].forEach(c => styleData(r.getCell(c), false, true));
        };
        addJRow(`IF(${has},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")`, `IF(${has},"ADJ-${pad}-D","")`,
          `IF(${has},IF(${isCI},'Input Tambahan'!E${IR},'Input Tambahan'!F${IR}),"")`,
          `IF(${has},'Input Tambahan'!C${IR},"")`,
          `IF(${has},IF(ISNUMBER('Input Tambahan'!G${IR}),'Input Tambahan'!G${IR},0),0)`, null, dR);
        addJRow(`IF(${has},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")`, `IF(${has},"ADJ-${pad}-K","")`,
          `IF(${has},IF(${isCI},'Input Tambahan'!F${IR},'Input Tambahan'!E${IR}),"")`,
          `IF(${has},'Input Tambahan'!C${IR},"")`,
          null, `IF(${has},IF(ISNUMBER('Input Tambahan'!G${IR}),'Input Tambahan'!G${IR},0),0)`, cR);
        addJRow(`IF(${hasHP},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")`, `IF(${hasHP},"ADJ-${pad}-HD","")`,
          `IF(${hasHP},"Harga Pokok Penjualan","")`, `IF(${hasHP},'Input Tambahan'!C${IR},"")`,
          `IF(${hasHP},'Input Tambahan'!N${IR},0)`, null, dH);
        addJRow(`IF(${hasHP},TEXT('Input Tambahan'!B${IR},"yyyy-mm-dd"),"")`, `IF(${hasHP},"ADJ-${pad}-HK","")`,
          `IF(${hasHP},"Persediaan Barang Dagang","")`, `IF(${hasHP},'Input Tambahan'!C${IR},"")`,
          null, `IF(${hasHP},'Input Tambahan'!N${IR},0)`, cH);
      }
      const jrnlLastRow = INPUT_JRNL_START + MAX_INPUTS * 4;
      jrnlSheet.pageSetup.printArea = `A1:G${jrnlLastRow}`; // col H (helper) & I (MENU) excluded

      // ═══════════════════════════════════════════════════════════
      // 3. KATALOG PRODUK
      // ═══════════════════════════════════════════════════════════
      const katSheet = workbook.addWorksheet('Katalog Produk');
      setupPage(katSheet);
      katSheet.columns = [{ width: 40 }, { width: 20 }, { width: 15 }, { width: 12 }];
      { const r = katSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = katSheet.addRow(['Katalog Produk & HPP per Unit']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = katSheet.addRow([`Data inventori per ${today}`]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const r = katSheet.addRow(['Perbarui nilai HPP jika ada perubahan harga beli. Kolom B dipakai otomatis di Input Tambahan via VLOOKUP.']); r.height = 20; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; r.getCell(1).alignment = { wrapText: true }; }
      katSheet.addRow([]);
      { const r = katSheet.addRow(['Nama Produk', 'HPP / Unit (Rp)', 'Stok Saat Ini', '↩ MENU']); r.height = 22;
        styleHdr(r.getCell(1)); styleHdr(r.getCell(2), true); styleHdr(r.getCell(3), true);
        styleMenuBtn(r.getCell(4), 'DAFTAR ISI'); }
      inventory.forEach((item, idx) => {
        const r = katSheet.addRow([item.name, item.costPerUnit, item.stock]); r.height = 18; const alt = idx % 2 === 1;
        styleData(r.getCell(1), alt); styleData(r.getCell(2), alt, true); r.getCell(2).numFmt = nFmt; styleData(r.getCell(3), alt, true);
      });
      if (inventory.length === 0) { const r = katSheet.addRow(['(Belum ada produk di inventori)']); styleData(r.getCell(1)); }
      katSheet.pageSetup.printArea = `A1:C${KATALOG_DATA_START + inventory.length + 1}`;

      // ═══════════════════════════════════════════════════════════
      // 4. DAFTAR AKUN
      // ═══════════════════════════════════════════════════════════
      const acctSheet = workbook.addWorksheet('Daftar Akun');
      setupPage(acctSheet);
      acctSheet.columns = [{ width: 20 }, { width: 40 }, { width: 20 }, { width: 12 }];
      { const r = acctSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = acctSheet.addRow(['Daftar Akun Referensi']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = acctSheet.addRow(['Nama akun WAJIB digunakan persis sama di Jurnal Umum & Input Tambahan.']); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; }
      acctSheet.addRow([]);
      { const r = acctSheet.addRow(['ID Akun', 'Nama Akun', 'Tipe', '↩ MENU']); r.height = 22;
        styleHdr(r.getCell(1)); styleHdr(r.getCell(2)); styleHdr(r.getCell(3)); styleMenuBtn(r.getCell(4), 'DAFTAR ISI'); }
      activeAccounts.forEach((acc, idx) => {
        const r = acctSheet.addRow([acc.id, acc.name, acc.type]); r.height = 18; const alt = idx % 2 === 1;
        styleData(r.getCell(1), alt); styleData(r.getCell(2), alt); styleData(r.getCell(3), alt);
      });
      acctSheet.pageSetup.printArea = `A1:C${ACCT_DATA_START + activeAccounts.length + 1}`;

      // ═══════════════════════════════════════════════════════════
      // 5. LABA RUGI
      // ═══════════════════════════════════════════════════════════
      const incomeSheetName = 'Laba Rugi';
      const incSheet = workbook.addWorksheet(incomeSheetName);
      setupPage(incSheet);
      incSheet.columns = [{ width: 42 }, { width: 22 }, { width: 12 }];
      { const r = incSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = incSheet.addRow(['Laporan Laba Rugi']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = incSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = incSheet.addRow(['', '', '↩ MENU']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); }
      { const r = incSheet.addRow(['Pendapatan']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const revStart = incSheet.rowCount + 1;
      activeAccounts.filter(a => a.type === 'Revenue').forEach(acc => {
        const r = incSheet.addRow([`  ${acc.name}`]); r.height = 18;
        r.getCell(2).value = fv(`SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)`, 0);
        r.getCell(2).numFmt = nFmt;
      });
      const revEnd = incSheet.rowCount; const totalRevRow = incSheet.rowCount + 1;
      { const r = incSheet.addRow(['Total Pendapatan']); r.height = 22; r.getCell(2).value = fv(`SUM(B${revStart}:B${revEnd})`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      incSheet.addRow([]);
      { const r = incSheet.addRow(['Beban']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const expStart = incSheet.rowCount + 1;
      let r_Penyusutan = 0, r_Amortisasi = 0, r_HPP = 0;
      activeAccounts.filter(a => a.type === 'Expenses').forEach(acc => {
        const rn = incSheet.rowCount + 1;
        if (acc.name === 'Beban Penyusutan') r_Penyusutan = rn;
        if (acc.name === 'Beban Amortisasi') r_Amortisasi = rn;
        if (acc.name === 'Harga Pokok Penjualan') r_HPP = rn;
        const r = incSheet.addRow([`  ${acc.name}`]); r.height = 18;
        r.getCell(2).value = fv(`SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)`, 0);
        r.getCell(2).numFmt = nFmt;
      });
      const expEnd = incSheet.rowCount; const totalExpRow = incSheet.rowCount + 1;
      { const r = incSheet.addRow(['Total Beban']); r.height = 22; r.getCell(2).value = fv(`SUM(B${expStart}:B${expEnd})`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      incSheet.addRow([]);
      const netIncRow = incSheet.rowCount + 1;
      { const r = incSheet.addRow(['LABA BERSIH']); r.height = 26; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.navy } }; r.getCell(2).value = fv(`B${totalRevRow}-B${totalExpRow}`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      incSheet.pageSetup.printArea = `A1:B${netIncRow + 2}`;

      // ═══════════════════════════════════════════════════════════
      // 6. NERACA
      // ═══════════════════════════════════════════════════════════
      const balSheetName = 'Neraca';
      const balSheet = workbook.addWorksheet(balSheetName);
      setupPage(balSheet);
      balSheet.columns = [{ width: 42 }, { width: 22 }, { width: 12 }];
      { const r = balSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = balSheet.addRow(['Neraca (Posisi Keuangan)']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = balSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = balSheet.addRow(['','','↩ MENU']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); }
      { const r = balSheet.addRow(['ASET']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const bsRows: Record<string, number> = {};
      const assetStart = balSheet.rowCount + 1;
      activeAccounts.filter(a => a.type === 'Assets').forEach(acc => {
        const rn = balSheet.rowCount + 1; bsRows[acc.name] = rn;
        const r = balSheet.addRow([`  ${acc.name}`]); r.height = 18;
        r.getCell(2).value = fv(`SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)`, 0); r.getCell(2).numFmt = nFmt;
      });
      const assetEnd = balSheet.rowCount; const totalAssetRow = balSheet.rowCount + 1;
      { const r = balSheet.addRow(['Total Aset']); r.height = 22; r.getCell(2).value = fv(`SUM(B${assetStart}:B${assetEnd})`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      balSheet.addRow([]); { const r = balSheet.addRow(['KEWAJIBAN & EKUITAS']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; } { const r = balSheet.addRow(['  Kewajiban']); r.height = 14; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const liabStart = balSheet.rowCount + 1;
      activeAccounts.filter(a => a.type === 'Liabilities').forEach(acc => {
        const rn = balSheet.rowCount + 1; bsRows[acc.name] = rn;
        const r = balSheet.addRow([`    ${acc.name}`]); r.height = 18;
        r.getCell(2).value = fv(`SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)`, 0); r.getCell(2).numFmt = nFmt;
      });
      const liabEnd = balSheet.rowCount;
      { const r = balSheet.addRow(['  Ekuitas']); r.height = 14; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const eqStart = balSheet.rowCount + 1;
      const r_Modal = balSheet.rowCount + 1; bsRows['Modal Pemilik'] = r_Modal;
      { const r = balSheet.addRow(['    Modal Pemilik']); r.height = 18; r.getCell(2).value = fv(`SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!E:E)`, 0); r.getCell(2).numFmt = nFmt; }
      const r_LabaDitahan = balSheet.rowCount + 1; bsRows['Laba Ditahan'] = r_LabaDitahan;
      { const r = balSheet.addRow(['    Laba Ditahan']); r.height = 18; r.getCell(2).value = fv(`SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!E:E)`, 0); r.getCell(2).numFmt = nFmt; }
      { const r = balSheet.addRow(['    Laba Bersih (Periode Berjalan)']); r.height = 18; r.getCell(2).value = fv(`'${incomeSheetName}'!B${netIncRow}`, 0); r.getCell(2).numFmt = nFmt; }
      const r_Prive = balSheet.rowCount + 1; bsRows['Prive'] = r_Prive;
      { const r = balSheet.addRow(['    Prive']); r.height = 18; r.getCell(2).value = fv(`SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!F:F)`, 0); r.getCell(2).numFmt = nFmt; }
      const totalLERow = balSheet.rowCount + 1;
      const liabSumF = liabStart > liabEnd ? '0' : `SUM(B${liabStart}:B${liabEnd})`;
      const eqSumF   = `B${eqStart}+B${eqStart+1}+B${eqStart+2}-B${eqStart+3}`;
      { const r = balSheet.addRow(['Total Kewajiban & Ekuitas']); r.height = 22; r.getCell(2).value = fv(`${liabSumF}+${eqSumF}`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      balSheet.pageSetup.printArea = `A1:B${totalLERow + 2}`;

      // ═══════════════════════════════════════════════════════════
      // 7. ARUS KAS
      // ═══════════════════════════════════════════════════════════
      const cashFlowName = 'Arus Kas';
      const cfSheet = workbook.addWorksheet(cashFlowName);
      setupPage(cfSheet); cfSheet.columns = [{ width: 46 }, { width: 22 }, { width: 12 }];
      { const r = cfSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = cfSheet.addRow(['Laporan Arus Kas (Indirect Method)']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = cfSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = cfSheet.addRow(['','','↩ MENU']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); }
      { const r = cfSheet.addRow(['Aktivitas Operasi']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const opStart = cfSheet.rowCount + 1;
      { const r = cfSheet.addRow(['  Laba Bersih']); r.height = 18; r.getCell(2).value = fv(`'${incomeSheetName}'!B${netIncRow}`, 0); r.getCell(2).numFmt = nFmt; }
      if (r_Penyusutan) { const r = cfSheet.addRow(['  Penyesuaian Penyusutan']); r.height = 18; r.getCell(2).value = fv(`'${incomeSheetName}'!B${r_Penyusutan}`, 0); r.getCell(2).numFmt = nFmt; }
      if (r_Amortisasi) { const r = cfSheet.addRow(['  Penyesuaian Amortisasi']); r.height = 18; r.getCell(2).value = fv(`'${incomeSheetName}'!B${r_Amortisasi}`, 0); r.getCell(2).numFmt = nFmt; }
      activeAccounts.filter(a => a.category === 'Current Assets' && !CASH_ACCOUNTS.includes(a.name)).forEach(acc => { const ref = bsRows[acc.name]; if (!ref) return; const r = cfSheet.addRow([`  Penurunan/(Kenaikan) ${acc.name}`]); r.height = 18; r.getCell(2).value = fv(`-'${balSheetName}'!B${ref}`, 0); r.getCell(2).numFmt = nFmt; });
      activeAccounts.filter(a => a.category === 'Current Liabilities').forEach(acc => { const ref = bsRows[acc.name]; if (!ref) return; const r = cfSheet.addRow([`  Kenaikan/(Penurunan) ${acc.name}`]); r.height = 18; r.getCell(2).value = fv(`'${balSheetName}'!B${ref}`, 0); r.getCell(2).numFmt = nFmt; });
      const opEnd = cfSheet.rowCount; const opTotalRow = cfSheet.rowCount + 1;
      { const r = cfSheet.addRow(['Kas Bersih Aktivitas Operasi']); r.height = 22; r.getCell(2).value = fv(`SUM(B${opStart}:B${opEnd})`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      cfSheet.addRow([]); { const r = cfSheet.addRow(['Aktivitas Investasi']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const invStart = cfSheet.rowCount + 1;
      activeAccounts.filter(a => ['Fixed Assets', 'Intangible Assets'].includes(a.category) && !a.name.startsWith('Akumulasi')).forEach(acc => { const ref = bsRows[acc.name]; if (!ref) return; const r = cfSheet.addRow([`  Pembelian/(Penjualan) ${acc.name}`]); r.height = 18; r.getCell(2).value = fv(`-'${balSheetName}'!B${ref}`, 0); r.getCell(2).numFmt = nFmt; });
      const invEnd = cfSheet.rowCount; const invTotalRow = cfSheet.rowCount + 1;
      { const r = cfSheet.addRow(['Kas Bersih Aktivitas Investasi']); r.height = 22; r.getCell(2).value = fv(invStart > invEnd ? '0' : `SUM(B${invStart}:B${invEnd})`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      cfSheet.addRow([]); { const r = cfSheet.addRow(['Aktivitas Pendanaan']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      const finStart = cfSheet.rowCount + 1;
      activeAccounts.filter(a => a.category === 'Long-term Liabilities').forEach(acc => { const ref = bsRows[acc.name]; if (!ref) return; const r = cfSheet.addRow([`  Penerimaan/(Pelunasan) ${acc.name}`]); r.height = 18; r.getCell(2).value = fv(`'${balSheetName}'!B${ref}`, 0); r.getCell(2).numFmt = nFmt; });
      activeAccounts.filter(a => a.category === 'Owner Equity').forEach(acc => { const ref = bsRows[acc.name]; if (!ref) return; const lbl = acc.name === 'Prive' ? `  (Penarikan Prive)` : `  Penambahan ${acc.name}`; const r = cfSheet.addRow([lbl]); r.height = 18; r.getCell(2).value = fv(acc.name === 'Prive' ? `-'${balSheetName}'!B${ref}` : `'${balSheetName}'!B${ref}`, 0); r.getCell(2).numFmt = nFmt; });
      const finEnd = cfSheet.rowCount; const finTotalRow = cfSheet.rowCount + 1;
      { const r = cfSheet.addRow(['Kas Bersih Aktivitas Pendanaan']); r.height = 22; r.getCell(2).value = fv(finStart > finEnd ? '0' : `SUM(B${finStart}:B${finEnd})`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      cfSheet.addRow([]);
      const netChangRow = cfSheet.rowCount + 1;
      { const r = cfSheet.addRow(['Kenaikan (Penurunan) Bersih Kas']); r.height = 22; r.getCell(2).value = fv(`B${opTotalRow}+B${invTotalRow}+B${finTotalRow}`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      { const r = cfSheet.addRow(['Saldo Kas & Bank Awal']); r.height = 18; r.getCell(2).value = 0; r.getCell(2).numFmt = nFmt; }
      const endCashRow = cfSheet.rowCount + 1;
      { const r = cfSheet.addRow(['Saldo Kas & Bank Akhir']); r.height = 22; r.getCell(2).value = fv(`B${netChangRow}+B${netChangRow+1}`, 0); r.getCell(2).numFmt = nFmt; styleTotal(r.getCell(1)); styleTotal(r.getCell(2), true); }
      { const r = cfSheet.addRow(['[Cek ke Neraca]']); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; const cekF = CASH_ACCOUNTS.filter(n => bsRows[n]).map(n => `'${balSheetName}'!B${bsRows[n]}`).join('+') || '0'; r.getCell(2).value = fv(cekF, 0); r.getCell(2).numFmt = nFmt; }
      cfSheet.pageSetup.printArea = `A1:B${cfSheet.rowCount + 2}`;

      // ═══════════════════════════════════════════════════════════
      // 8. BUKU BESAR
      // ═══════════════════════════════════════════════════════════
      activeAccounts.forEach(accountInfo => {
        const sheetName = sanitizeSheetName(accountInfo.name);
        const ldSheet = workbook.addWorksheet(sheetName);
        setupPage(ldSheet);
        ldSheet.columns = [{ width: 12 }, { width: 10 }, { width: 25 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 16 }];
        { const r = ldSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
        { const r = ldSheet.addRow([`Buku Besar: ${accountInfo.name}`]); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
        { const r = ldSheet.addRow([`Per Tanggal Cetak: ${today}`]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
        ldSheet.addRow([]);
        { const r = ldSheet.addRow(['Tanggal', 'ID', 'Akun', 'Keterangan', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo (Rp)']); r.height = 22;
          [1,2,3,4].forEach(c => styleHdr(r.getCell(c))); [5,6,7].forEach(c => styleHdr(r.getCell(c), true)); }
        ldSheet.views = [{ state: 'frozen', ySplit: 5, showGridLines: false, zoomScale: 100 }];
        const isDebitNormal = ['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive';
        const filteredEntries = reportData.generalJournal.journalEntries.filter(e => e.accountName === accountInfo.name);
        const maxRows = Math.max(300, filteredEntries.length + 50);
        let runningSaldo = 0;
        for (let i = 0; i < maxRows; i++) {
          const rowRef = 6 + i; const prevRef = rowRef - 1;
          const colF = (col: string) => `IFERROR(INDEX('${journalSheetName}'!${col}:${col},MATCH("${accountInfo.name}"&(ROW()-5),'${journalSheetName}'!H:H,0)),"")`;
          const saldoF = isDebitNormal
            ? (i === 0 ? `IF(A${rowRef}="","",E${rowRef}-F${rowRef})` : `IF(A${rowRef}="","",G${prevRef}+E${rowRef}-F${rowRef})`)
            : (i === 0 ? `IF(A${rowRef}="","",F${rowRef}-E${rowRef})` : `IF(A${rowRef}="","",G${prevRef}+F${rowRef}-E${rowRef})`);
          const entry = filteredEntries[i]; const alt = i % 2 === 1;
          const r = ldSheet.addRow(['','','','',0,0,0]); r.height = 18;
          const debit  = entry && entry.entryType === 'Debit'  ? entry.amount : 0;
          const credit = entry && entry.entryType === 'Credit' ? entry.amount : 0;
          r.getCell(1).value = fv(colF('A'), entry ? format(new Date(entry.date), 'yyyy-MM-dd') : '');
          r.getCell(2).value = fv(colF('B'), entry?.id ?? '');
          r.getCell(3).value = fv(colF('C'), entry?.accountName ?? '');
          r.getCell(4).value = fv(colF('D'), entry?.description ?? '');
          r.getCell(5).value = fv(colF('E'), debit);  r.getCell(5).numFmt = nFmt;
          r.getCell(6).value = fv(colF('F'), credit); r.getCell(6).numFmt = nFmt;
          if (entry) runningSaldo += isDebitNormal ? (debit - credit) : (credit - debit);
          r.getCell(7).value = fv(saldoF, entry ? runningSaldo : 0); r.getCell(7).numFmt = nFmt;
          [1,2].forEach(c => styleData(r.getCell(c), alt));
          [3,4].forEach(c => styleData(r.getCell(c), alt, false, true));
          [5,6,7].forEach(c => styleData(r.getCell(c), alt, true));
        }
        ldSheet.pageSetup.printArea = `A1:G${5 + maxRows}`;
      });

      // ═══════════════════════════════════════════════════════════
      // 9. AUDIT & INVESTOR
      // ═══════════════════════════════════════════════════════════
      const auditSheet = workbook.addWorksheet('Audit & Investor');
      setupPage(auditSheet); auditSheet.columns = [{ width: 40 }, { width: 25 }, { width: 40 }];
      { const r = auditSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = auditSheet.addRow(['Laporan Executive Audit & Investor Dashboard']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = auditSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = auditSheet.addRow(['','','↩ MENU']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); }
      const aR = (lbl: string, f: string|null, note = '-', pct = false) => {
        const r = auditSheet.addRow([lbl, '', note]); r.height = 18;
        if (f) { r.getCell(2).value = fv(f, 0); r.getCell(2).numFmt = pct ? '0.00%' : nFmt; }
        return r;
      };
      { const r = auditSheet.addRow(['Kesimpulan Analisis','','Keterangan']); r.height = 16; [1,3].forEach(c => { r.getCell(c).font = { name: 'Calibri', bold: true, size: 10 }; }); }
      aR('Status Kesehatan', `IF(B12=0,"EMPTY",IF(B10<B17,"CRITICAL ALERT",IF(B19<0.15,"WARNING",IF(AND(B26>0.20,B19>0.30),"KEUANGAN SANGAT PRIMA","SEHAT & PROFITABLE"))))`, '-');
      aR('Deskripsi', `IF(B12=0,"Belum ada data.",IF(B10<B17,"Perusahaan mengalami kerugian operasional.",IF(B19<0.15,"Berhasil melewati impas, margin rentan.",IF(AND(B26>0.20,B19>0.30),"ROI tinggi, margin aman.","Fundamental sehat, aman di atas Titik Impas."))))`, '-');
      auditSheet.addRow([]);
      { const r = auditSheet.addRow(['Komponen Operasional','','Rumus']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      aR('Total Pendapatan',           `'${incomeSheetName}'!B${totalRevRow}`, 'Dari Laba Rugi');
      aR('Total Biaya Variabel (HPP)', r_HPP ? `'${incomeSheetName}'!B${r_HPP}` : '0', 'Dari HPP');
      aR('Total Biaya Tetap',          `IF(B10>0,'${incomeSheetName}'!B${totalExpRow}-B11,0)`, 'Total Beban - HPP');
      aR('Margin Kontribusi',          `IF(B10>0,B10-B11,0)`, 'Pendapatan - HPP');
      aR('Rasio Margin Kontribusi',    `IF(B10>0,B13/B10,0)`, 'Margin / Pendapatan', true);
      auditSheet.addRow([]);
      { const r = auditSheet.addRow(['Indikator BEP & Target','','Rumus']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      aR('Titik Impas / BEP (Rp)',     `IF(B14>0,B12/B14,0)`, 'Biaya Tetap / Rasio Margin');
      aR('Batas Aman / MoS (Rp)',      `IF(B10>0,B10-B17,0)`, 'Pendapatan - BEP');
      aR('Margin of Safety (%)',       `IF(B10>0,B18/B10,0)`, 'MoS / Pendapatan', true);
      auditSheet.addRow([]);
      { const r = auditSheet.addRow(['Kinerja Investasi (ROI & ROA)','','Rumus']); r.height = 16; r.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }; }
      aR('Modal Pemilik',          `'${balSheetName}'!B${r_Modal}`, 'Modal Disetor');
      aR('Laba Ditahan',           `'${balSheetName}'!B${r_LabaDitahan}`, 'Laba Masa Lalu');
      aR('Total Ekuitas Penjamin', 'B22+B23', 'Modal + Laba Ditahan');
      aR('Total Aset',             `'${balSheetName}'!B${totalAssetRow}`, 'Dari Neraca');
      aR('Laba Bersih',            `'${incomeSheetName}'!B${netIncRow}`, 'Dari Laba Rugi');
      aR('Return on Investment (ROI)', 'IF(B24>0,B26/B24,0)', 'Laba / Total Ekuitas', true);
      aR('Return on Asset (ROA)',      'IF(B25>0,B26/B25,0)', 'Laba / Total Aset', true);
      auditSheet.pageSetup.printArea = `A1:B${auditSheet.rowCount + 2}`;

      // ═══════════════════════════════════════════════════════════
      // DOWNLOAD via browser Blob
      // ═══════════════════════════════════════════════════════════
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'Laporan Keuangan FinansiaProf.xlsx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error('Export XLSX error:', err);
      alert(`Gagal export XLSX: ${err?.message || err}`);
    }
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
        margin: { left: 20, right: 10, top: 40, bottom: 20 },
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
        columnStyles: { 
            0: { cellWidth: 145 }, 
            1: { cellWidth: 35, halign: 'right' } 
        },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Laporan Laba Rugi'),
    });
    
    // --- Neraca ---
    doc.addPage();
    const sortedAssetEntries = Object.entries(reportData.balanceSheet.assets).sort(([aName], [bName]) => {
      const aId = activeAccounts.find(acc => acc.name === aName)?.id || '9999';
      const bId = activeAccounts.find(acc => acc.name === bName)?.id || '9999';
      return aId.localeCompare(bId);
    });

    autoTable(doc, {
        startY: 40,
        margin: { left: 20, right: 10, top: 40, bottom: 20 },
        head: [['Aset', '']],
        body: sortedAssetEntries.map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
        foot: [[{content:'Total Aset', styles:{fontStyle:'bold'}}, {content: formatCurrency(reportData.balanceSheet.totalAssets), styles: {halign: 'right', fontStyle:'bold'}}]],
        theme: 'striped',
        styles: { valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        columnStyles: { 
            0: { cellWidth: 145 }, 
            1: { cellWidth: 35, halign: 'right' } 
        },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Neraca'),
    });

     autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        margin: { left: 20, right: 10, top: 40, bottom: 20 },
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
        margin: { left: 20, right: 10, top: 40, bottom: 20 },
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
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 85 },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Jurnal Umum'),
    });

     // --- Laporan Arus Kas ---
    doc.addPage();
    autoTable(doc, {
        startY: 40,
        margin: { left: 20, right: 10, top: 40, bottom: 20 },
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
        columnStyles: { 
            0: { cellWidth: 145 }, 
            1: { cellWidth: 35, halign: 'right' } 
        },
        didDrawPage: (data) => addHeaderAndFooter(data, 'Laporan Arus Kas'),
    });

     // --- Buku Besar ---
    reportData.generalLedger.sortedLedgerAccounts.forEach(account => {
        if (account.entries.length === 0) return;
        doc.addPage();
         autoTable(doc, {
            startY: 40,
            margin: { left: 20, right: 10, top: 40, bottom: 20 },
            theme: 'striped',
            styles: { valign: 'middle' },
            headStyles: { fillColor: primaryColor, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 50 },
                2: { cellWidth: 35, halign: 'right' },
                3: { cellWidth: 35, halign: 'right' },
                4: { cellWidth: 35, halign: 'right' }
            },
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
        margin: { left: 20, right: 10, top: 40, bottom: 20 },
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
        columnStyles: { 
            0: { cellWidth: 120 },
            1: { cellWidth: 60, halign: 'right' }
        },
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

