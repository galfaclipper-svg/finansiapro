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
      const styleDashBtn = (cell: any) => {
        cell.value     = { text: '📊 DASH', hyperlink: `#'📊 DASHBOARD'!A1` };
        cell.font      = { name: 'Calibri', bold: true, size: 9, color: { argb: C.white } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C5CE7' } };
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
      // DASHBOARD — Power BI Executive Summary (Tab pertama)
      // ═══════════════════════════════════════════════════════════
      const DASH_NAME = '📊 DASHBOARD';
      const dashSheet = workbook.addWorksheet(DASH_NAME);
      dashSheet.views = [{ showGridLines: false, zoomScale: 85 }];
      dashSheet.pageSetup.paperSize    = 9;
      dashSheet.pageSetup.orientation  = 'landscape';
      dashSheet.pageSetup.fitToPage    = true;
      dashSheet.pageSetup.fitToWidth   = 1;
      dashSheet.pageSetup.fitToHeight  = 0;
      dashSheet.pageSetup.margins      = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

      // Dashboard color palette (dark theme)
      const DC = {
        bg:       'FF0F1923',  // Very dark bg
        navy:     'FF1A2B40',  // Card bg
        navyMd:   'FF243555',  // Card alt bg
        navyLt:   'FF2E4268',  // Lighter navy
        accent:   'FF0D84FF',  // Bright blue accent
        green:    'FF00D085',  // Vibrant green
        greenDk:  'FF00875A',  // Dark green
        red:      'FFFF4757',  // Vibrant red
        redDk:    'FFB02030',  // Dark red
        gold:     'FFFFD32A',  // Gold
        purple:   'FF6C5CE7',  // Purple
        teal:     'FF00CEC9',  // Teal
        orange:   'FFFD9644',  // Orange
        white:    'FFFFFFFF',
        whiteD:   'FFBBC9D9',  // Dimmed white
        gray:     'FF6B8099',  // Gray text
        border:   'FF1E3A5F',  // Border color
        barFull:  'FF0D84FF',  // Bar filled
        barEmpty: 'FF1A2B40',  // Bar empty
      };

      // Dash helper: solid fill cell
      const df = (cell: any, bg: string, fg = DC.white, sz = 10, bold = false, center = false, wrap = false) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { name: 'Calibri', size: sz, bold, color: { argb: fg } };
        cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: wrap };
      };
      const dfc = (cell: any, bg: string, fg = DC.white, sz = 10, bold = false) => df(cell, bg, fg, sz, bold, true);
      const dfBorder = (cell: any, bg: string) => {
        cell.border = { top: { style: 'thin', color: { argb: DC.border } }, bottom: { style: 'thin', color: { argb: DC.border } }, left: { style: 'thin', color: { argb: DC.border } }, right: { style: 'thin', color: { argb: DC.border } } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      };
      const dMerge = (sheet: any, range: string, bg: string) => {
        try { sheet.mergeCells(range); } catch(e) {}
        const [startCell] = range.split(':');
        dfBorder(sheet.getCell(startCell), bg);
      };

      // Helper: make horizontal bar string
      const mkBar = (val: number, maxVal: number, len = 12) => {
        if (maxVal === 0) return '░'.repeat(len);
        const n = Math.max(0, Math.min(len, Math.round((Math.abs(val) / Math.abs(maxVal)) * len)));
        return '█'.repeat(n) + '░'.repeat(len - n);
      };
      const fmtRp = (v: number) => {
        if (Math.abs(v) >= 1_000_000_000) return `Rp ${(v/1_000_000_000).toFixed(1)}M`;
        if (Math.abs(v) >= 1_000_000) return `Rp ${(v/1_000_000).toFixed(1)}Jt`;
        if (Math.abs(v) >= 1_000) return `Rp ${(v/1_000).toFixed(0)}Rb`;
        return `Rp ${v.toFixed(0)}`;
      };

      // Column widths (14 cols: A-N)
      dashSheet.columns = [
        { width: 1.2 },   // A margin
        { width: 14.5 },  // B
        { width: 0.8 },   // C gutter
        { width: 14.5 },  // D
        { width: 0.8 },   // E
        { width: 14.5 },  // F
        { width: 0.8 },   // G
        { width: 14.5 },  // H
        { width: 0.8 },   // I
        { width: 14.5 },  // J
        { width: 0.8 },   // K
        { width: 14.5 },  // L
        { width: 1.2 },   // M margin
      ];

      // === PRECOMPUTE VALUES FROM REPORT DATA ===
      const dash_rev    = reportData.incomeStatement.totalRevenue;
      const dash_exp    = reportData.incomeStatement.totalExpenses;
      const dash_net    = reportData.incomeStatement.netIncome;
      const dash_assets = reportData.balanceSheet.totalAssets;
      const dash_cash   = reportData.cashFlow.endingCash;
      const dash_roi    = dash_assets > 0 ? (dash_net / dash_assets) * 100 : 0;
      const dash_opCF   = reportData.cashFlow.totalOperating;
      const dash_invCF  = reportData.cashFlow.totalInvesting;
      const dash_finCF  = reportData.cashFlow.totalFinancing;
      const dash_txCount = transactions.filter(t => {
        if (!dateRange?.from) return true;
        const d = new Date(t.date).getTime();
        const f = dateRange.from.getTime();
        const to = dateRange?.to ? dateRange.to.getTime() : Date.now();
        return d >= f && d <= to;
      }).length;

      // Sort revenue & expense items
      const revItems = Object.entries(reportData.incomeStatement.revenues)
        .sort((a,b) => b[1]-a[1]).slice(0, 6);
      const expItems = Object.entries(reportData.incomeStatement.expenses)
        .sort((a,b) => b[1]-a[1]).slice(0, 6);
      const maxRev = revItems.length > 0 ? revItems[0][1] : 1;
      const maxExp = expItems.length > 0 ? expItems[0][1] : 1;

      // Top inventory by stock value
      const topInv = [...inventory]
        .map(i => ({ ...i, val: (i.stock || 0) * (i.costPerUnit || 0) }))
        .sort((a,b) => b.val - a.val).slice(0, 5);

      // Health determination
      const gpMargin = dash_rev > 0 ? (dash_net / dash_rev) * 100 : 0;
      const dash_health = dash_rev === 0 ? { label: 'BELUM ADA DATA', color: DC.gray, icon: '⬜' }
        : dash_net < 0               ? { label: 'CRITICAL — MERUGI', color: DC.red, icon: '🔴' }
        : gpMargin < 10              ? { label: 'WARNING — MARGIN TIPIS', color: DC.orange, icon: '🟡' }
        : gpMargin >= 30             ? { label: 'EXCELLENT — PRIMA', color: DC.green, icon: '🟢' }
                                     : { label: 'SEHAT & PROFITABLE', color: DC.teal, icon: '🔵' };

      // ── ROW HELPERS ─────────────────────────────────────────────
      const dRow = (h = 18) => { const r = dashSheet.addRow([]); r.height = h; return r; };
      const fillRow = (rn: number, bg: string) => {
        for (let c = 1; c <= 13; c++) df(dashSheet.getRow(rn).getCell(c), bg);
      };

      // ════════════════════════════════════════════════════════
      // ROW 1-4: HEADER BANNER
      // ════════════════════════════════════════════════════════
      // Row 1
      let dr = dRow(10); fillRow(dr.number, DC.bg);
      // Row 2 — Company + Title
      dr = dRow(32); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:I${dr.number}`);
      const h2cell = dashSheet.getCell(`B${dr.number}`);
      h2cell.value = `📊  DASHBOARD KEUANGAN  —  ${companyName.toUpperCase()}`;
      h2cell.font = { name: 'Calibri', bold: true, size: 20, color: { argb: DC.white } };
      h2cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.bg } };
      h2cell.alignment = { vertical: 'middle', horizontal: 'left' };
      dashSheet.mergeCells(`J${dr.number}:L${dr.number}`);
      const h2badge = dashSheet.getCell(`J${dr.number}`);
      h2badge.value = `${dash_health.icon}  ${dash_health.label}`;
      h2badge.font = { name: 'Calibri', bold: true, size: 11, color: { argb: DC.white } };
      h2badge.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dash_health.color } };
      h2badge.alignment = { vertical: 'middle', horizontal: 'center' };

      // Row 3 — Period info
      dr = dRow(20); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:F${dr.number}`);
      const h3cell = dashSheet.getCell(`B${dr.number}`);
      h3cell.value = `${periodString}   |   Dicetak: ${today}   |   Total Transaksi: ${dash_txCount}`;
      h3cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: DC.whiteD } };
      h3cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.bg } };
      h3cell.alignment = { vertical: 'middle', horizontal: 'left' };
      // Row 4 — accent line
      dr = dRow(5); fillRow(dr.number, DC.accent);

      // ════════════════════════════════════════════════════════
      // ROW 5: NAVIGATION BAR
      // ════════════════════════════════════════════════════════
      dr = dRow(22); fillRow(dr.number, DC.navy);
      const navRow = dr.number;
      const navSheets: Array<{name: string, sheet: string, col: string, bg: string}> = [
        { name: '📋 Input',     sheet: 'Input Tambahan',  col: 'B', bg: 'FF0D84FF' },
        { name: '📓 Jurnal',    sheet: 'Jurnal Umum',     col: 'D', bg: 'FF247BA0' },
        { name: '🏷️ Katalog',  sheet: 'Katalog Produk',  col: 'F', bg: 'FF1B6B38' },
        { name: '📑 Akun',      sheet: 'Daftar Akun',     col: 'H', bg: 'FF0D84FF' },
        { name: '💹 Laba Rugi', sheet: 'Laba Rugi',       col: 'J', bg: 'FF00875A' },
        { name: '⚖️ Neraca',   sheet: 'Neraca',           col: 'L', bg: 'FF2E4268' },
      ];
      navSheets.forEach(ns => {
        const nc = dashSheet.getCell(`${ns.col}${navRow}`);
        nc.value = { text: ns.name, hyperlink: `#'${ns.sheet}'!A1` };
        nc.font = { name: 'Calibri', bold: true, size: 9, color: { argb: DC.white } };
        nc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ns.bg } };
        nc.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      // Extra nav links in same row col note
      const navSheets2: Array<{name: string, sheet: string, col: string, bg: string}> = [
        { name: '💸 Arus Kas',   sheet: 'Arus Kas',          col: 'B', bg: 'FF4A90D9' },
        { name: '🔍 Audit',      sheet: 'Audit & Investor',  col: 'D', bg: 'FF6C5CE7' },
        { name: '📋 Daftar Isi', sheet: 'DAFTAR ISI',        col: 'J', bg: 'FF34495E' },
      ];

      // ════════════════════════════════════════════════════════
      // ROW 6: SPACER + secondary nav
      // ════════════════════════════════════════════════════════
      dr = dRow(20); fillRow(dr.number, DC.bg);
      const navRow2 = dr.number;
      navSheets2.forEach(ns => {
        const nc = dashSheet.getCell(`${ns.col}${navRow2}`);
        nc.value = { text: ns.name, hyperlink: `#'${ns.sheet}'!A1` };
        nc.font = { name: 'Calibri', bold: true, size: 9, color: { argb: DC.white } };
        nc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ns.bg } };
        nc.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // ════════════════════════════════════════════════════════
      // ROWS 7-8: SPACER
      // ════════════════════════════════════════════════════════
      dr = dRow(10); fillRow(dr.number, DC.bg);

      // ════════════════════════════════════════════════════════
      // KPI CARDS (6 CARDS across 2 rows: B D F H J L)
      // ════════════════════════════════════════════════════════
      const kpiCols = ['B', 'D', 'F', 'H', 'J', 'L'];
      const kpiCards = [
        {
          icon: '💰', label: 'TOTAL PENDAPATAN',
          value: fmtRp(dash_rev),
          sub: dash_rev > 0 ? `${Object.keys(reportData.incomeStatement.revenues).length} sumber` : 'Belum ada',
          bg: 'FF0D2137', accent: DC.teal,
          trend: dash_rev > 0 ? '▲ AKTIF' : '—',
          trendColor: dash_rev > 0 ? DC.green : DC.gray,
        },
        {
          icon: '📉', label: 'TOTAL BEBAN',
          value: fmtRp(dash_exp),
          sub: dash_exp > 0 ? `${Object.keys(reportData.incomeStatement.expenses).length} kategori` : 'Belum ada',
          bg: 'FF1A1226', accent: DC.purple,
          trend: dash_exp > 0 ? '▲ TERCATAT' : '—',
          trendColor: DC.purple,
        },
        {
          icon: dash_net >= 0 ? '💎' : '⚠️', label: 'LABA BERSIH',
          value: fmtRp(dash_net),
          sub: `Margin: ${dash_rev > 0 ? gpMargin.toFixed(1)+'%' : 'N/A'}`,
          bg: dash_net >= 0 ? 'FF0A2518' : 'FF250A0A', accent: dash_net >= 0 ? DC.green : DC.red,
          trend: dash_net >= 0 ? '▲ UNTUNG' : '▼ RUGI',
          trendColor: dash_net >= 0 ? DC.green : DC.red,
        },
        {
          icon: '🏦', label: 'TOTAL ASET',
          value: fmtRp(dash_assets),
          sub: `${Object.keys(reportData.balanceSheet.assets).length} akun aset`,
          bg: 'FF0D1E2E', accent: DC.accent,
          trend: dash_assets > 0 ? '▲ TERCATAT' : '—',
          trendColor: DC.accent,
        },
        {
          icon: '💵', label: 'SALDO KAS',
          value: fmtRp(dash_cash),
          sub: `Kas Bersih Akhir`,
          bg: 'FF0D2137', accent: DC.teal,
          trend: dash_cash >= 0 ? '▲ POSITIF' : '▼ DEFISIT',
          trendColor: dash_cash >= 0 ? DC.green : DC.red,
        },
        {
          icon: '📈', label: 'ROI',
          value: `${dash_roi.toFixed(1)}%`,
          sub: `Return on Assets`,
          bg: dash_roi >= 20 ? 'FF1F1A00' : dash_roi >= 10 ? 'FF0A2518' : 'FF1A0D00',
          accent: dash_roi >= 20 ? DC.gold : dash_roi >= 10 ? DC.green : DC.orange,
          trend: dash_roi >= 20 ? '🏆 EXCELLENT' : dash_roi >= 10 ? '✅ BAGUS' : dash_roi >= 0 ? '⚠️ LEMAH' : '❌ NEGATIF',
          trendColor: dash_roi >= 20 ? DC.gold : dash_roi >= 10 ? DC.green : dash_roi >= 0 ? DC.orange : DC.red,
        },
      ];

      // Draw KPI cards (5 rows each: label, value, sub, trend, spacer)
      const kpiStartRow = dashSheet.rowCount + 1;
      // Row: icon + label
      dr = dRow(20); fillRow(dr.number, DC.bg);
      kpiCards.forEach((card, i) => {
        const cell = dashSheet.getCell(`${kpiCols[i]}${dr.number}`);
        cell.value = `  ${card.icon}  ${card.label}`;
        cell.font = { name: 'Calibri', bold: true, size: 8, color: { argb: card.accent } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        // fill gutter
        const gcol = String.fromCharCode(kpiCols[i].charCodeAt(0) + 1);
        df(dashSheet.getCell(`${gcol}${dr.number}`), card.bg);
      });
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Row: big value
      dr = dRow(30); fillRow(dr.number, DC.bg);
      kpiCards.forEach((card, i) => {
        const cell = dashSheet.getCell(`${kpiCols[i]}${dr.number}`);
        cell.value = card.value;
        cell.font = { name: 'Calibri', bold: true, size: 18, color: { argb: DC.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        const gcol = String.fromCharCode(kpiCols[i].charCodeAt(0) + 1);
        df(dashSheet.getCell(`${gcol}${dr.number}`), card.bg);
      });
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Row: sub label
      dr = dRow(16); fillRow(dr.number, DC.bg);
      kpiCards.forEach((card, i) => {
        const cell = dashSheet.getCell(`${kpiCols[i]}${dr.number}`);
        cell.value = `  ${card.sub}`;
        cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: DC.gray } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        const gcol = String.fromCharCode(kpiCols[i].charCodeAt(0) + 1);
        df(dashSheet.getCell(`${gcol}${dr.number}`), card.bg);
      });
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Row: trend indicator
      dr = dRow(18); fillRow(dr.number, DC.bg);
      kpiCards.forEach((card, i) => {
        const cell = dashSheet.getCell(`${kpiCols[i]}${dr.number}`);
        cell.value = `  ${card.trend}`;
        cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: card.trendColor } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        const gcol = String.fromCharCode(kpiCols[i].charCodeAt(0) + 1);
        df(dashSheet.getCell(`${gcol}${dr.number}`), card.bg);
      });
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Row: bottom accent bar for each card
      dr = dRow(5); fillRow(dr.number, DC.bg);
      kpiCards.forEach((card, i) => {
        const cell = dashSheet.getCell(`${kpiCols[i]}${dr.number}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.accent } };
        const gcol = String.fromCharCode(kpiCols[i].charCodeAt(0) + 1);
        df(dashSheet.getCell(`${gcol}${dr.number}`), DC.bg);
      });
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Spacer
      dr = dRow(10); fillRow(dr.number, DC.bg);

      // ════════════════════════════════════════════════════════
      // SECTION: REVENUE & EXPENSE BREAKDOWN (side by side)
      // ════════════════════════════════════════════════════════
      // Section headers
      dr = dRow(22); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:F${dr.number}`);
      const revHdr = dashSheet.getCell(`B${dr.number}`);
      revHdr.value = '  💰 RINCIAN PENDAPATAN';
      revHdr.font = { name: 'Calibri', bold: true, size: 11, color: { argb: DC.teal } };
      revHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyMd } };
      revHdr.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`G${dr.number}`), DC.bg);
      dashSheet.mergeCells(`H${dr.number}:L${dr.number}`);
      const expHdr = dashSheet.getCell(`H${dr.number}`);
      expHdr.value = '  📉 RINCIAN BEBAN';
      expHdr.font = { name: 'Calibri', bold: true, size: 11, color: { argb: DC.purple } };
      expHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyMd } };
      expHdr.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Column sub-headers
      dr = dRow(18); fillRow(dr.number, DC.bg);
      ['B','D'].forEach(c => {
        const cell = dashSheet.getCell(`${c}${dr.number}`);
        cell.value = c === 'B' ? '  Nama Akun Pendapatan' : '  Bar';
        cell.font = { name: 'Calibri', bold: true, size: 8, color: { argb: DC.gray } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      const fCell = dashSheet.getCell(`F${dr.number}`);
      fCell.value = '  Nominal';
      fCell.font = { name: 'Calibri', bold: true, size: 8, color: { argb: DC.gray } };
      fCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      fCell.alignment = { vertical: 'middle', horizontal: 'right' };
      df(dashSheet.getCell(`C${dr.number}`), DC.bg);
      df(dashSheet.getCell(`E${dr.number}`), DC.bg);
      df(dashSheet.getCell(`G${dr.number}`), DC.bg);
      ['H','J'].forEach(c => {
        const cell = dashSheet.getCell(`${c}${dr.number}`);
        cell.value = c === 'H' ? '  Nama Akun Beban' : '  Bar';
        cell.font = { name: 'Calibri', bold: true, size: 8, color: { argb: DC.gray } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      const lCell = dashSheet.getCell(`L${dr.number}`);
      lCell.value = '  Nominal';
      lCell.font = { name: 'Calibri', bold: true, size: 8, color: { argb: DC.gray } };
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      lCell.alignment = { vertical: 'middle', horizontal: 'right' };
      ['I','K'].forEach(c => df(dashSheet.getCell(`${c}${dr.number}`), DC.bg));
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Data rows (max 6 items each side)
      const maxRevExpRows = Math.max(revItems.length, expItems.length, 1);
      for (let ri = 0; ri < Math.min(maxRevExpRows, 6); ri++) {
        dr = dRow(18); fillRow(dr.number, DC.bg);
        const alt = ri % 2 === 1;
        const rowBg = alt ? DC.navyMd : DC.navy;
        // Revenue side
        if (ri < revItems.length) {
          const [rName, rVal] = revItems[ri];
          const pct = maxRev > 0 ? rVal / maxRev : 0;
          const bar = mkBar(rVal, maxRev, 10);
          const nameC = dashSheet.getCell(`B${dr.number}`);
          nameC.value = `  ${rName}`;
          nameC.font = { name: 'Calibri', size: 9, color: { argb: DC.whiteD } };
          nameC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          nameC.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
          const barC = dashSheet.getCell(`D${dr.number}`);
          barC.value = bar;
          barC.font = { name: 'Consolas', size: 9, color: { argb: pct > 0.5 ? DC.teal : DC.gray } };
          barC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          barC.alignment = { vertical: 'middle', horizontal: 'left' };
          const valC = dashSheet.getCell(`F${dr.number}`);
          valC.value = rVal;
          valC.numFmt = '#,##0';
          valC.font = { name: 'Calibri', bold: true, size: 9, color: { argb: DC.teal } };
          valC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          valC.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          ['B','D','F'].forEach(c => df(dashSheet.getCell(`${c}${dr.number}`), rowBg));
        }
        df(dashSheet.getCell(`C${dr.number}`), DC.bg);
        df(dashSheet.getCell(`E${dr.number}`), DC.bg);
        df(dashSheet.getCell(`G${dr.number}`), DC.bg);
        // Expense side
        if (ri < expItems.length) {
          const [eName, eVal] = expItems[ri];
          const ePct = maxExp > 0 ? eVal / maxExp : 0;
          const eBar = mkBar(eVal, maxExp, 10);
          const eNameC = dashSheet.getCell(`H${dr.number}`);
          eNameC.value = `  ${eName}`;
          eNameC.font = { name: 'Calibri', size: 9, color: { argb: DC.whiteD } };
          eNameC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          eNameC.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
          const eBarC = dashSheet.getCell(`J${dr.number}`);
          eBarC.value = eBar;
          eBarC.font = { name: 'Consolas', size: 9, color: { argb: ePct > 0.5 ? DC.purple : DC.gray } };
          eBarC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          eBarC.alignment = { vertical: 'middle', horizontal: 'left' };
          const eValC = dashSheet.getCell(`L${dr.number}`);
          eValC.value = eVal;
          eValC.numFmt = '#,##0';
          eValC.font = { name: 'Calibri', bold: true, size: 9, color: { argb: DC.purple } };
          eValC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          eValC.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          ['H','J','L'].forEach(c => df(dashSheet.getCell(`${c}${dr.number}`), rowBg));
        }
        ['I','K'].forEach(c => df(dashSheet.getCell(`${c}${dr.number}`), DC.bg));
        df(dashSheet.getCell(`A${dr.number}`), DC.bg);
        df(dashSheet.getCell(`M${dr.number}`), DC.bg);
      }
      // Total rows
      dr = dRow(20); fillRow(dr.number, DC.bg);
      const revTotCell = dashSheet.getCell(`B${dr.number}`);
      revTotCell.value = '  TOTAL PENDAPATAN';
      revTotCell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: DC.teal } };
      revTotCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      revTotCell.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`D${dr.number}`), DC.navyLt);
      const revTotVal = dashSheet.getCell(`F${dr.number}`);
      revTotVal.value = dash_rev;
      revTotVal.numFmt = '#,##0';
      revTotVal.font = { name: 'Calibri', bold: true, size: 10, color: { argb: DC.teal } };
      revTotVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      revTotVal.alignment = { vertical: 'middle', horizontal: 'right' };
      df(dashSheet.getCell(`C${dr.number}`), DC.bg);
      df(dashSheet.getCell(`E${dr.number}`), DC.bg);
      df(dashSheet.getCell(`G${dr.number}`), DC.bg);
      const expTotCell = dashSheet.getCell(`H${dr.number}`);
      expTotCell.value = '  TOTAL BEBAN';
      expTotCell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: DC.purple } };
      expTotCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      expTotCell.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`J${dr.number}`), DC.navyLt);
      const expTotVal = dashSheet.getCell(`L${dr.number}`);
      expTotVal.value = dash_exp;
      expTotVal.numFmt = '#,##0';
      expTotVal.font = { name: 'Calibri', bold: true, size: 10, color: { argb: DC.purple } };
      expTotVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      expTotVal.alignment = { vertical: 'middle', horizontal: 'right' };
      ['I','K'].forEach(c => df(dashSheet.getCell(`${c}${dr.number}`), DC.bg));
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Spacer
      dr = dRow(10); fillRow(dr.number, DC.bg);

      // ════════════════════════════════════════════════════════
      // SECTION: CASH FLOW VISUAL BARS
      // ════════════════════════════════════════════════════════
      dr = dRow(22); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:L${dr.number}`);
      const cfTitle = dashSheet.getCell(`B${dr.number}`);
      cfTitle.value = '  💸 LAPORAN ARUS KAS — Ringkasan Visual';
      cfTitle.font = { name: 'Calibri', bold: true, size: 11, color: { argb: DC.gold } };
      cfTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyMd } };
      cfTitle.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      const maxCF = Math.max(Math.abs(dash_opCF), Math.abs(dash_invCF), Math.abs(dash_finCF), 1);
      const cfItems = [
        { label: '⚙️  Aktivitas Operasi', val: dash_opCF, color: dash_opCF >= 0 ? DC.green : DC.red },
        { label: '🏗️  Aktivitas Investasi', val: dash_invCF, color: dash_invCF >= 0 ? DC.teal : DC.orange },
        { label: '💳 Aktivitas Pendanaan', val: dash_finCF, color: DC.accent },
      ];
      cfItems.forEach((cf, ci) => {
        dr = dRow(22); fillRow(dr.number, DC.bg);
        const cfAlt = ci % 2 === 0 ? DC.navy : DC.navyMd;
        const lblC = dashSheet.getCell(`B${dr.number}`);
        lblC.value = `  ${cf.label}`;
        lblC.font = { name: 'Calibri', size: 9, color: { argb: DC.whiteD } };
        lblC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cfAlt } };
        lblC.alignment = { vertical: 'middle', horizontal: 'left' };
        df(dashSheet.getCell(`C${dr.number}`), DC.bg);
        // bar across D-J
        const barStr = mkBar(cf.val, maxCF, 14);
        const barC = dashSheet.getCell(`D${dr.number}`);
        dashSheet.mergeCells(`D${dr.number}:J${dr.number}`);
        barC.value = `  ${barStr}  ${cf.val >= 0 ? '+' : ''}${fmtRp(cf.val)}`;
        barC.font = { name: 'Consolas', bold: true, size: 11, color: { argb: cf.color } };
        barC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cfAlt } };
        barC.alignment = { vertical: 'middle', horizontal: 'left' };
        df(dashSheet.getCell(`K${dr.number}`), DC.bg);
        const cfStatus = dashSheet.getCell(`L${dr.number}`);
        cfStatus.value = cf.val >= 0 ? 'SURPLUS ▲' : 'DEFISIT ▼';
        cfStatus.font = { name: 'Calibri', bold: true, size: 9, color: { argb: cf.val >= 0 ? DC.green : DC.red } };
        cfStatus.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cfAlt } };
        cfStatus.alignment = { vertical: 'middle', horizontal: 'center' };
        df(dashSheet.getCell(`A${dr.number}`), DC.bg);
        df(dashSheet.getCell(`M${dr.number}`), DC.bg);
      });
      // Net cash total
      dr = dRow(22); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:D${dr.number}`);
      const netCFLbl = dashSheet.getCell(`B${dr.number}`);
      netCFLbl.value = '  📍 SALDO KAS AKHIR';
      netCFLbl.font = { name: 'Calibri', bold: true, size: 10, color: { argb: DC.gold } };
      netCFLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      netCFLbl.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`E${dr.number}`), DC.navyLt);
      dashSheet.mergeCells(`F${dr.number}:H${dr.number}`);
      const netCFVal = dashSheet.getCell(`F${dr.number}`);
      netCFVal.value = dash_cash;
      netCFVal.numFmt = '#,##0;(#,##0)';
      netCFVal.font = { name: 'Calibri', bold: true, size: 12, color: { argb: dash_cash >= 0 ? DC.green : DC.red } };
      netCFVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
      netCFVal.alignment = { vertical: 'middle', horizontal: 'center' };
      ['I','J','K','L'].forEach(c => df(dashSheet.getCell(`${c}${dr.number}`), DC.navyLt));
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Spacer
      dr = dRow(10); fillRow(dr.number, DC.bg);

      // ════════════════════════════════════════════════════════
      // SECTION: BALANCE SHEET SNAPSHOT + INVENTORY
      // ════════════════════════════════════════════════════════
      dr = dRow(22); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:F${dr.number}`);
      const bsTitle = dashSheet.getCell(`B${dr.number}`);
      bsTitle.value = '  ⚖️  NERACA — Posisi Keuangan';
      bsTitle.font = { name: 'Calibri', bold: true, size: 11, color: { argb: DC.accent } };
      bsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyMd } };
      bsTitle.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`G${dr.number}`), DC.bg);
      dashSheet.mergeCells(`H${dr.number}:L${dr.number}`);
      const invTitle = dashSheet.getCell(`H${dr.number}`);
      invTitle.value = '  🏷️  INVENTARIS — Top Produk';
      invTitle.font = { name: 'Calibri', bold: true, size: 11, color: { argb: DC.orange } };
      invTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyMd } };
      invTitle.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // BS items (aset, kewajiban, ekuitas)
      const bsData = [
        { label: '  TOTAL ASET',               val: dash_assets,       color: DC.accent },
        { label: '  Total Kewajiban',           val: reportData.balanceSheet.totalAssets - (reportData.balanceSheet.totalAssets), color: DC.orange },
        { label: '  Laba Bersih Periode',       val: dash_net,          color: dash_net >= 0 ? DC.green : DC.red },
      ];
      // use assets breakdown for display
      const assetsList = Object.entries(reportData.balanceSheet.assets).sort((a,b) => b[1]-a[1]).slice(0, 4);
      const liabsList  = Object.entries(reportData.balanceSheet.liabilities).sort((a,b) => b[1]-a[1]).slice(0, 2);
      const bsRows2 = [
        ...assetsList.map(([n,v]) => ({ label: `  ${n}`, val: v, color: DC.whiteD, bg: DC.navy })),
        { label: '  ━━ TOTAL ASET',  val: dash_assets, color: DC.accent, bg: DC.navyLt },
        ...liabsList.map(([n,v]) => ({ label: `  ${n}`, val: v, color: DC.orange, bg: DC.navy })),
        { label: '  ━━ Laba Bersih', val: dash_net,    color: dash_net >= 0 ? DC.green : DC.red, bg: DC.navyLt },
      ];
      bsRows2.forEach((bsr, bsi) => {
        dr = dRow(18); fillRow(dr.number, DC.bg);
        const bsLbl = dashSheet.getCell(`B${dr.number}`);
        bsLbl.value = bsr.label;
        bsLbl.font = { name: 'Calibri', size: 9, bold: bsr.label.includes('━━') || bsr.label.includes('TOTAL'), color: { argb: bsr.color } };
        bsLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bsr.bg } };
        bsLbl.alignment = { vertical: 'middle', horizontal: 'left' };
        df(dashSheet.getCell(`C${dr.number}`), DC.bg);
        df(dashSheet.getCell(`D${dr.number}`), bsr.bg);
        df(dashSheet.getCell(`E${dr.number}`), DC.bg);
        const bsVal = dashSheet.getCell(`F${dr.number}`);
        bsVal.value = bsr.val;
        bsVal.numFmt = '#,##0;(#,##0)';
        bsVal.font = { name: 'Calibri', bold: true, size: 9, color: { argb: bsr.color } };
        bsVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bsr.bg } };
        bsVal.alignment = { vertical: 'middle', horizontal: 'right' };
        df(dashSheet.getCell(`G${dr.number}`), DC.bg);
        // Inventory side
        if (bsi < topInv.length) {
          const inv = topInv[bsi];
          const invLbl = dashSheet.getCell(`H${dr.number}`);
          invLbl.value = `  ${inv.name}`;
          invLbl.font = { name: 'Calibri', size: 9, color: { argb: DC.whiteD } };
          invLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bsi % 2 === 0 ? DC.navy : DC.navyMd } };
          invLbl.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
          df(dashSheet.getCell(`I${dr.number}`), bsi % 2 === 0 ? DC.navy : DC.navyMd);
          const invStk = dashSheet.getCell(`J${dr.number}`);
          invStk.value = `Stok: ${inv.stock}`;
          invStk.font = { name: 'Calibri', size: 9, color: { argb: DC.gray } };
          invStk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bsi % 2 === 0 ? DC.navy : DC.navyMd } };
          invStk.alignment = { vertical: 'middle', horizontal: 'center' };
          df(dashSheet.getCell(`K${dr.number}`), bsi % 2 === 0 ? DC.navy : DC.navyMd);
          const invVal = dashSheet.getCell(`L${dr.number}`);
          invVal.value = inv.val;
          invVal.numFmt = '#,##0';
          invVal.font = { name: 'Calibri', bold: true, size: 9, color: { argb: DC.orange } };
          invVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bsi % 2 === 0 ? DC.navy : DC.navyMd } };
          invVal.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          ['H','I','J','K','L'].forEach(c => df(dashSheet.getCell(`${c}${dr.number}`), DC.navy));
        }
        df(dashSheet.getCell(`A${dr.number}`), DC.bg);
        df(dashSheet.getCell(`M${dr.number}`), DC.bg);
      });

      // Spacer
      dr = dRow(10); fillRow(dr.number, DC.bg);

      // ════════════════════════════════════════════════════════
      // SECTION: FINANCIAL HEALTH + KEY RATIOS
      // ════════════════════════════════════════════════════════
      dr = dRow(22); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:L${dr.number}`);
      const healthTitle = dashSheet.getCell(`B${dr.number}`);
      healthTitle.value = `  🩺 STATUS KESEHATAN KEUANGAN:   ${dash_health.icon}  ${dash_health.label}`;
      healthTitle.font = { name: 'Calibri', bold: true, size: 12, color: { argb: dash_health.color } };
      healthTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyMd } };
      healthTitle.alignment = { vertical: 'middle', horizontal: 'left' };
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // Key ratios row
      dr = dRow(22); fillRow(dr.number, DC.bg);
      const ratios = [
        { label: 'Margin Laba', val: `${gpMargin.toFixed(1)}%`, color: gpMargin >= 20 ? DC.green : gpMargin >= 10 ? DC.teal : DC.orange, col: 'B' },
        { label: 'ROI', val: `${dash_roi.toFixed(1)}%`, color: dash_roi >= 20 ? DC.gold : dash_roi >= 10 ? DC.green : DC.orange, col: 'D' },
        { label: 'Total Transaksi', val: `${dash_txCount}`, color: DC.accent, col: 'F' },
        { label: 'Total Akun Aktif', val: `${activeAccounts.length}`, color: DC.whiteD, col: 'H' },
        { label: 'Jml. Produk', val: `${inventory.length}`, color: DC.orange, col: 'J' },
        { label: 'Laba Bersih', val: fmtRp(dash_net), color: dash_net >= 0 ? DC.green : DC.red, col: 'L' },
      ];
      ratios.forEach(ratio => {
        const rCell = dashSheet.getCell(`${ratio.col}${dr.number}`);
        rCell.value = `${ratio.label}: ${ratio.val}`;
        rCell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: ratio.color } };
        rCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.navyLt } };
        rCell.alignment = { vertical: 'middle', horizontal: 'center' };
        const gcol = String.fromCharCode(ratio.col.charCodeAt(0) + 1);
        df(dashSheet.getCell(`${gcol}${dr.number}`), DC.bg);
      });
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);

      // ════════════════════════════════════════════════════════
      // FOOTER
      // ════════════════════════════════════════════════════════
      dr = dRow(8); fillRow(dr.number, DC.accent);
      dr = dRow(18); fillRow(dr.number, DC.bg);
      dashSheet.mergeCells(`B${dr.number}:H${dr.number}`);
      const footCell = dashSheet.getCell(`B${dr.number}`);
      footCell.value = `⚡ Dibuat otomatis oleh FinansiaProf  |  ${today}  |  Data bersifat RAHASIA & KONFIDENSIAL`;
      footCell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: DC.gray } };
      footCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.bg } };
      footCell.alignment = { vertical: 'middle', horizontal: 'left' };
      dashSheet.mergeCells(`I${dr.number}:L${dr.number}`);
      const copyCell = dashSheet.getCell(`I${dr.number}`);
      copyCell.value = `© ${new Date().getFullYear()} ${companyName} — All Rights Reserved`;
      copyCell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: DC.gray } };
      copyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DC.bg } };
      copyCell.alignment = { vertical: 'middle', horizontal: 'right' };
      df(dashSheet.getCell(`A${dr.number}`), DC.bg);
      df(dashSheet.getCell(`M${dr.number}`), DC.bg);
      dr = dRow(6); fillRow(dr.number, DC.bg);

      dashSheet.pageSetup.printArea = `A1:M${dashSheet.rowCount}`;

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
      { const r = tocSheet.addRow(['  ★ ', '📊 BUKA DASHBOARD EKSEKUTIF  →']); r.height = 22;
        r.getCell(2).value = { text: '📊  BUKA DASHBOARD EKSEKUTIF  ★', hyperlink: `#'${DASH_NAME}'!A1` };
        r.getCell(2).font  = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' }, underline: false };
        r.getCell(2).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C5CE7' } };
        r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }; }
      tR('');
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
        { width: 12 }, // Col P: MENU button
        { width: 10 }, // Col Q: DASHBOARD button
      ];
      // Info rows 1-6
      { const r = inputSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = inputSheet.addRow(['INPUT TAMBAHAN — Entri Transaksi Langsung di Excel']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = inputSheet.addRow([`Akun Kas: ${CASH_ACCOUNTS.join(', ')}`]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const r = inputSheet.addRow(['PETUNJUK: Isi kolom B-M. Pilih Tipe, Akun Kas, dan Akun Lawan dari dropdown. Tiap baris otomatis menghasilkan 4 entri jurnal (Pendapatan + HPP).']); r.height = 20; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; r.getCell(1).alignment = { wrapText: true }; }
      { const r = inputSheet.addRow(['TIP: Kolom N (Total HPP) dihitung otomatis via VLOOKUP ke Katalog Produk. Untuk layanan/non-produk, kosongkan kolom H-M.']); r.height = 20; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; r.getCell(1).alignment = { wrapText: true }; }
      inputSheet.addRow([]);
      // Table header (row 7)
      { const r = inputSheet.addRow(['No', 'Tanggal *', 'Deskripsi *', 'Tipe *', 'Akun Kas *', 'Akun Lawan / Kategori *', 'Nominal * (Rp)', 'Produk 1', 'Qty 1', 'Produk 2', 'Qty 2', 'Produk 3', 'Qty 3', 'Total HPP\n(Auto)', 'Validasi\nAkun', '↩ MENU', '📊 DASH']); r.height = 32;
        [1,2,3,4,5,6,7,8,9,10,11,12,13,15].forEach(c => styleHdr(r.getCell(c), c !== 2 && c !== 3 && c !== 5 && c !== 6 && c !== 8 && c !== 10 && c !== 12));
        styleGrnHdr(r.getCell(14));
        styleMenuBtn(r.getCell(16), 'DAFTAR ISI'); styleDashBtn(r.getCell(17)); }
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
        { width: 12 },               // I: MENU button
        { width: 10 },               // J: DASHBOARD button
      ];
      { const r = jrnlSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = jrnlSheet.addRow(['Jurnal Umum']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = jrnlSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      jrnlSheet.addRow([]);
      { const r = jrnlSheet.addRow(['Tanggal', 'ID Transaksi', 'Nama Akun', 'Keterangan / Deskripsi', 'Debit (Rp)', 'Kredit (Rp)', 'Cek Akun', 'HelperBB', '↩ MENU', '📊 DASH']); r.height = 24;
        [1,2,3,4].forEach(c => styleHdr(r.getCell(c))); [5,6,7].forEach(c => styleHdr(r.getCell(c), true));
        r.getCell(8).font = { name: 'Calibri', size: 7, color: { argb: C.textGray } };
        styleMenuBtn(r.getCell(9), 'DAFTAR ISI'); styleDashBtn(r.getCell(10)); }
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
      katSheet.columns = [{ width: 40 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 10 }];
      { const r = katSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = katSheet.addRow(['Katalog Produk & HPP per Unit']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = katSheet.addRow([`Data inventori per ${today}`]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const r = katSheet.addRow(['Perbarui nilai HPP jika ada perubahan harga beli. Kolom B dipakai otomatis di Input Tambahan via VLOOKUP.']); r.height = 20; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; r.getCell(1).alignment = { wrapText: true }; }
      katSheet.addRow([]);
      { const r = katSheet.addRow(['Nama Produk', 'HPP / Unit (Rp)', 'Stok Saat Ini', '↩ MENU', '📊 DASH']); r.height = 22;
        styleHdr(r.getCell(1)); styleHdr(r.getCell(2), true); styleHdr(r.getCell(3), true);
        styleMenuBtn(r.getCell(4), 'DAFTAR ISI'); styleDashBtn(r.getCell(5)); }
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
      acctSheet.columns = [{ width: 20 }, { width: 40 }, { width: 20 }, { width: 12 }, { width: 10 }];
      { const r = acctSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = acctSheet.addRow(['Daftar Akun Referensi']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = acctSheet.addRow(['Nama akun WAJIB digunakan persis sama di Jurnal Umum & Input Tambahan.']); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: C.textGray } }; }
      acctSheet.addRow([]);
      { const r = acctSheet.addRow(['ID Akun', 'Nama Akun', 'Tipe', '↩ MENU', '📊 DASH']); r.height = 22;
        styleHdr(r.getCell(1)); styleHdr(r.getCell(2)); styleHdr(r.getCell(3)); styleMenuBtn(r.getCell(4), 'DAFTAR ISI'); styleDashBtn(r.getCell(5)); }
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
      incSheet.columns = [{ width: 42 }, { width: 22 }, { width: 12 }, { width: 10 }];
      { const r = incSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = incSheet.addRow(['Laporan Laba Rugi']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = incSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = incSheet.addRow(['', '', '↩ MENU', '📊 DASH']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); styleDashBtn(menuR.getCell(4)); }
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
      balSheet.columns = [{ width: 42 }, { width: 22 }, { width: 12 }, { width: 10 }];
      { const r = balSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = balSheet.addRow(['Neraca (Posisi Keuangan)']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = balSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = balSheet.addRow(['','','↩ MENU','📊 DASH']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); styleDashBtn(menuR.getCell(4)); }
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
      setupPage(cfSheet); cfSheet.columns = [{ width: 46 }, { width: 22 }, { width: 12 }, { width: 10 }];
      { const r = cfSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = cfSheet.addRow(['Laporan Arus Kas (Indirect Method)']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = cfSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = cfSheet.addRow(['','','↩ MENU','📊 DASH']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); styleDashBtn(menuR.getCell(4)); }
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
        ldSheet.columns = [{ width: 12 }, { width: 10 }, { width: 25 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }];
        { const r = ldSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
        { const r = ldSheet.addRow([`Buku Besar: ${accountInfo.name}`]); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
        { const r = ldSheet.addRow([`Per Tanggal Cetak: ${today}`]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
        ldSheet.addRow([]);
        { const r = ldSheet.addRow(['Tanggal', 'ID', 'Akun', 'Keterangan', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo (Rp)', '📊 DASH']); r.height = 22;
          [1,2,3,4].forEach(c => styleHdr(r.getCell(c))); [5,6,7].forEach(c => styleHdr(r.getCell(c), true));
          styleDashBtn(r.getCell(8)); }
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
      setupPage(auditSheet); auditSheet.columns = [{ width: 40 }, { width: 25 }, { width: 40 }, { width: 10 }];
      { const r = auditSheet.addRow([companyName]); r.height = 24; r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy } }; }
      { const r = auditSheet.addRow(['Laporan Executive Audit & Investor Dashboard']); r.height = 18; r.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.blue } }; }
      { const r = auditSheet.addRow([periodString]); r.height = 14; r.getCell(1).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.textGray } }; }
      { const menuR = auditSheet.addRow(['','','↩ MENU','📊 DASH']); menuR.height = 14; styleMenuBtn(menuR.getCell(3), 'DAFTAR ISI'); styleDashBtn(menuR.getCell(4)); }
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
          rows.push(['', {content: `(${firstEntry.description})`, colSpan: 3, styles: {textColor: [150, 150, 150], fontStyle: 'italic', cellPadding: { top: 3, right: 2, bottom: 3, left: 10 }}}]);
          
           if (cogsEntries.length > 0) {
                cogsEntries.forEach((entry) => {
                    rows.push([
                        '',
                        { content: entry.accountName, styles: { cellPadding: { top: 3, right: 2, bottom: 3, left: entry.entryType === 'Credit' ? 10 : 2 }}},
                        { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                        { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } }
                    ]);
                });
                rows.push(['', {content: `(Mencatat HPP untuk penjualan)`, colSpan: 3, styles: {textColor: [150, 150, 150], fontStyle: 'italic', cellPadding: { top: 3, right: 2, bottom: 3, left: 10 }}}]);
           }

          return rows;
        }),
        theme: 'striped',
        styles: { valign: 'middle' },
        headStyles: { fillColor: primaryColor, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 84 },
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
                0: { cellWidth: 26 },
                1: { cellWidth: 49 },
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

