

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
import { useAppState } from '@/hooks/use-app-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx-js-style';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ReportsPage() {
  const { transactions, inventory, companyProfile } = useAppState();

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

    // --- 1. Universal Journal Entry Generation ---
    let baseJournalEntries = augmentedTransactions.flatMap(t => {
      const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
      const accountType = account?.type;
      const cashAccountName = "Kas";

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

      // Standard cash transactions
      if (t.type === 'cash-in') {
          return [ { ...t, entryType: 'Debit', accountName: cashAccountName, amount: t.amount }, { ...t, entryType: 'Credit', accountName: t.category, amount: t.amount }];
      } else { // cash-out
          if (accountType === 'Assets' && t.category !== cashAccountName) {
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
    const accountBalances: { [key: string]: number } = {};
    CHART_OF_ACCOUNTS.forEach(acc => { accountBalances[acc.name] = 0; });

    allJournalEntries.forEach(entry => {
        const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === entry.accountName);
        if (!accountInfo) return;
        const amount = entry.amount;
        if (['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive') {
            accountBalances[entry.accountName] += (entry.entryType === 'Debit' ? amount : -amount);
        } else { // Liabilities, Equity, Revenue
            accountBalances[entry.accountName] += (entry.entryType === 'Credit' ? amount : -amount);
        }
    });
    
    // --- 4. Build Reports from Final Balances ---

    // Income Statement Data
    const revenues: { [key: string]: number } = {};
    const expenses: { [key: string]: number } = {};
    Object.entries(accountBalances).forEach(([accountName, balance]) => {
      const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
      if (!accountInfo) return;
      if (accountInfo.type === 'Revenue' && balance !== 0) revenues[accountName] = balance;
      if (accountInfo.type === 'Expenses' && balance !== 0) expenses[accountName] = balance;
    });
    const totalRevenue = Object.values(revenues).reduce((sum, amount) => sum + amount, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    // Balance Sheet Data
    const assets: { [key: string]: number } = {};
    const liabilities: { [key: string]: number } = {};
    Object.entries(accountBalances).forEach(([accountName, balance]) => {
      const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
      if (accountInfo?.type === 'Assets' && balance !== 0) assets[accountName] = balance;
      if (accountInfo?.type === 'Liabilities' && balance !== 0) liabilities[accountName] = balance;
    });

    const equityAccounts: { [key: string]: number } = {
      'Modal Pemilik': accountBalances['Modal Pemilik'] || 0,
      'Laba Ditahan': accountBalances['Laba Ditahan'] || 0,
      'Laba Bersih (Periode Berjalan)': netIncome,
      'Prive': accountBalances['Prive'] || 0,
    };
    
    const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
    const totalEquity = (equityAccounts['Modal Pemilik'] || 0) + (equityAccounts['Laba Ditahan'] || 0) + netIncome - (equityAccounts['Prive'] || 0); // Prive is a contra-equity account (subtraction)
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // General Journal Data
    const journalEntries = allJournalEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id) || (a.entryType === 'Debit' ? -1 : 1));

    // Cash Flow Data
    const operatingFlows: { name: string, amount: number }[] = [];
    const investingFlows: { name: string, amount: number }[] = [];
    const financingFlows: { name: string, amount: number }[] = [];
    
    const cashTransactions = augmentedTransactions.filter(t => !['Beban Penyusutan', 'Beban Amortisasi'].includes(t.category));
    
    cashTransactions.forEach(t => {
      const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
      if (!account || t.category === 'Kas') return;
      
      const amount = t.type === 'cash-in' ? t.amount : -t.amount;
      
      if (['Revenue', 'Expenses'].includes(account.type) || ['Persediaan Barang Dagang', 'Piutang Usaha', 'Utang Usaha'].includes(account.name)) {
        operatingFlows.push({ name: t.description, amount: amount });
      } else if (account.type === 'Assets' && !['Kas', 'Bank', 'Persediaan Barang Dagang', 'Piutang Usaha'].includes(account.name)) {
        investingFlows.push({ name: t.description, amount: amount });
      } else if (['Liabilities', 'Equity'].includes(account.type) && !['Utang Usaha'].includes(account.name)) {
         financingFlows.push({ name: t.description, amount: amount });
      }
    });

    const totalOperating = operatingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    const totalInvesting = investingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    const totalFinancing = financingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    
    const endingCash = accountBalances['Kas'] || 0;
    const netCashFlow = totalOperating + totalInvesting + totalFinancing;
    const beginningCash = endingCash - netCashFlow;

    // General Ledger Data
    const allJournalEntriesForLedger = allJournalEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ledgerAccountsData: { [key: string]: { entries: any[], balance: number, accountInfo: any } } = {};
    
    CHART_OF_ACCOUNTS.forEach(accountInfo => {
        const entriesForAccount = allJournalEntriesForLedger.filter(entry => entry.accountName === accountInfo.name);
        let runningBalance = 0;
        const entriesWithBalance = entriesForAccount.map(entry => {
             const debit = entry.entryType === 'Debit' ? entry.amount : 0;
             const credit = entry.entryType === 'Credit' ? entry.amount : 0;
             if (['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive') { runningBalance += debit - credit; } 
             else { runningBalance += credit - debit; }
            return {...entry, balance: runningBalance};
        });
        ledgerAccountsData[accountInfo.name] = { entries: entriesWithBalance, balance: runningBalance, accountInfo };
    });
    const sortedLedgerAccounts = Object.values(ledgerAccountsData).sort((a, b) => (a.accountInfo?.id ?? 9999) > (b.accountInfo?.id ?? 9999) ? 1 : -1);


    return {
      incomeStatement: { revenues, totalRevenue, expenses, totalExpenses, netIncome },
      balanceSheet: { assets, liabilities, equity: equityAccounts, totalAssets, totalLiabilitiesAndEquity },
      generalJournal: { journalEntries },
      cashFlow: { operatingFlows, totalOperating, investingFlows, totalInvesting, financingFlows, totalFinancing, netCashFlow, beginningCash, endingCash },
      generalLedger: { sortedLedgerAccounts }
    };
  }, [transactions, inventory, companyProfile.name]);

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const companyName = companyProfile.name;
    const journalSheetName = "Jurnal Umum";

    const sanitizeSheetName = (name: string) => {
        return name.replace(/[\\/*?[\]:]/g, '').substring(0, 31);
    };

    const applyNumberFormatting = (ws: XLSX.WorkSheet, cols: number[]) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = Math.max(range.s.r, 1); R <= Math.max(range.e.r, 500); ++R) { 
        for (const C of cols) {
          const cell_address = {c: C, r: R};
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          if (!ws[cell_ref]) ws[cell_ref] = { t: 'n', v: 0 }; 
          ws[cell_ref].z = `_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)`;
        }
      }
    };

    const backMenuBtn = { v: "⬅️ MENU", l: { Target: "#'DAFTAR ISI'!A1" }, s: { font: { color: { rgb: "FFFFFF" }, bold: true }, fill: { fgColor: { rgb: "0052cc" } }, alignment: { horizontal: "center" } } };

    const applyTableBorders = (ws: XLSX.WorkSheet) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const borderStyle = { style: "thin", color: { rgb: "D3D3D3" } };
        const borders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };
        for (let R = range.s.r; R <= range.e.r; ++R) { 
            let rowHasData = false;
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell = ws[XLSX.utils.encode_cell({c: C, r: R})];
                if (cell && cell.v !== undefined && cell.v !== "") rowHasData = true; 
            }
            if(!rowHasData) continue;
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
                let cell = ws[cell_ref];
                if (!cell) { ws[cell_ref] = { t: 's', v: '' }; cell = ws[cell_ref]; }
                cell.s = cell.s || {};
                if (cell.v !== "⬅️ MENU") {
                    cell.s.border = borders;
                }
            }
        }
    };
    
    const headerStyle = {font:{bold:true, sz:16}};
    const subHeaderStyle = {font:{bold:true, sz:14}};
    const dateStyle = {font:{italic:true}};
    const boldStyle = {font:{bold:true}};

    // --- 0. DAFTAR ISI (TOC) ---
    const tocData: any[] = [
        [{ v: "DAFTAR ISI LAPORAN KEUANGAN", s: { font: { bold: true, sz: 18 } } }],
        [{ v: companyName, s: { font: { sz: 14 } } }],
        [{ v: `Periode/Cetak: ${today}`, s: { font: { italic: true } } }],
        [],
        [{ v: "Silakan KLIK pada baris manapun di bawah untuk melompat langsung ke lembar (sheet) yang bersangkutan:", s: { font: { italic: true } } }],
        [],
        [{ v: "1. Utama & Transaksi", s: { font: { bold: true, sz: 14 } } }],
        [{ v: "➡️ Jurnal Umum", l: { Target: "#'Jurnal Umum'!A1" }, s: { font: { color: { rgb: "0000FF" }, underline: true } } }],
        [{ v: "➡️ Daftar Akun (Referensi)", l: { Target: "#'Daftar Akun'!A1" }, s: { font: { color: { rgb: "0000FF" }, underline: true } } }],
        [],
        [{ v: "2. Laporan Utama", s: { font: { bold: true, sz: 14 } } }],
        [{ v: "➡️ Laba Rugi", l: { Target: "#'Laba Rugi'!A1" }, s: { font: { color: { rgb: "0000FF" }, underline: true } } }],
        [{ v: "➡️ Neraca", l: { Target: "#'Neraca'!A1" }, s: { font: { color: { rgb: "0000FF" }, underline: true } } }],
        [{ v: "➡️ Arus Kas", l: { Target: "#'Arus Kas'!A1" }, s: { font: { color: { rgb: "0000FF" }, underline: true } } }],
        [],
        [{ v: "3. Alat Investigasi Khusus", s: { font: { bold: true, sz: 14 } } }],
        [{ v: "➡️ Audit & Investor", l: { Target: "#'Audit & Investor'!A1" }, s: { font: { color: { rgb: "0000FF" }, underline: true } } }],
        [],
        [{ v: "4. Buku Besar (Per Akun)", s: { font: { bold: true, sz: 14 } } }]
    ];
    
    CHART_OF_ACCOUNTS.forEach(accountInfo => {
        const safeName = sanitizeSheetName(accountInfo.name);
        tocData.push([{ v: `      📓 BB: ${safeName}`, l: { Target: `#'${safeName}'!A1` }, s: { font: { color: { rgb: "3c78d8" }, underline: true } } }]);
    });

    const wsTOC = XLSX.utils.aoa_to_sheet(tocData);
    wsTOC['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsTOC, "DAFTAR ISI");

    // --- 1. Jurnal Umum ---
    const journalExportData: any[] = [
      ["Tanggal", "ID", "Akun", "Deskripsi", "Debit", "Kredit", "Cek Pengetikan", "HelperBukuBesar", backMenuBtn]
    ];
    let helperCounts: Record<string, number> = {};
    reportData.generalJournal.journalEntries.forEach((entry, index) => {
        const rowNum = 2 + index;
        const vAkun = entry.accountName;
        helperCounts[vAkun] = (helperCounts[vAkun] || 0) + 1;
        const vHelper = `${vAkun}${helperCounts[vAkun]}`;
        
        journalExportData.push([
            { t: 's', v: format(new Date(entry.date), 'yyyy-MM-dd') },
            { t: 's', v: entry.id },
            { t: 's', v: vAkun },
            { t: 's', v: entry.description },
            { t: 'n', v: entry.entryType === 'Debit' ? entry.amount : 0 },
            { t: 'n', v: entry.entryType === 'Credit' ? entry.amount : 0 },
            { t: 'str', f: `IF(C${rowNum}="","",IF(ISNUMBER(MATCH(C${rowNum},'Daftar Akun'!$A$2:$A$100,0)),"✅ OK", "❌ NAMA AKUN SALAH! Lihat Daftar Akun!"))` },
            { t: 'str', v: vHelper, f: `IF(C${rowNum}="","",C${rowNum}&COUNTIF($C$2:C${rowNum}, C${rowNum}))` }
        ]);
    });
    for (let i = 0; i < 500; i++) {
        const rowNum = 2 + reportData.generalJournal.journalEntries.length + i;
        journalExportData.push([
            "", 
            { t: 'str', f: `IF(C${rowNum}="","",IF(A${rowNum}<>"", "TRX-"&TEXT(ROW(),"0000"), B${rowNum-1}))` }, 
            "", "", 0, 0, 
            { t: 'str', f: `IF(C${rowNum}="","",IF(ISNUMBER(MATCH(C${rowNum},'Daftar Akun'!$A$2:$A$100,0)),"✅ OK", "❌ NAMA AKUN SALAH! Lihat Daftar Akun!"))` }, 
            { t: 'str', f: `IF(C${rowNum}="","",C${rowNum}&COUNTIF($C$2:C${rowNum}, C${rowNum}))`}
        ]);
    }

    const wsJournal = XLSX.utils.aoa_to_sheet(journalExportData);
    wsJournal['!cols'] = [{wch: 12}, {wch: 15}, {wch: 30}, {wch: 40}, {wch: 15}, {wch: 15}, {wch: 40}, {hidden: true, wch: 20}, {wch: 15}];
    applyNumberFormatting(wsJournal, [4, 5]);
    applyTableBorders(wsJournal);
    XLSX.utils.book_append_sheet(wb, wsJournal, journalSheetName);

    // Daftar Akun (Referensi)
    const wsAccountList = XLSX.utils.aoa_to_sheet([["Daftar Akun Referensi (WAJIB SAMA)", "", backMenuBtn], ...CHART_OF_ACCOUNTS.map(a => [a.name])]);
    wsAccountList['!cols'] = [{wch: 35}, {wch: 10}, {wch: 15}];
    applyTableBorders(wsAccountList);
    XLSX.utils.book_append_sheet(wb, wsAccountList, 'Daftar Akun');

    // --- 2. Laporan Laba Rugi ---
    const incomeSheetName = "Laba Rugi";
    const incomeData: any[] = [
      [{v: companyName, s:headerStyle}, "", backMenuBtn],
      [{v: incomeSheetName, s:subHeaderStyle}],
      [{v: `Per Tanggal Cetak: ${today}`, s:dateStyle}],
      [],
    ];
    
    incomeData.push([{v:"Pendapatan", s:boldStyle}]);
    const revenueStartRow = incomeData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').forEach(acc => {
        incomeData.push([ `  ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)` }]);
    });
    const revenueEndRow = incomeData.length;
    incomeData.push([ {v:"Total Pendapatan", s:boldStyle}, { t: 'n', f: `SUM(B${revenueStartRow}:B${revenueEndRow})`, s:boldStyle} ]);
    const totalRevenueRow = incomeData.length;

    incomeData.push([]);

    incomeData.push([{v:"Beban", s:boldStyle}]);
    const expenseStartRow = incomeData.length + 1;
    let r_BebanPenyusutan = 0, r_BebanAmortisasi = 0, r_HPP = 0;
    
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').forEach(acc => {
        const rowNum = incomeData.length + 1;
        if(acc.name === 'Beban Penyusutan') r_BebanPenyusutan = rowNum;
        if(acc.name === 'Beban Amortisasi') r_BebanAmortisasi = rowNum;
        if(acc.name === 'Harga Pokok Penjualan') r_HPP = rowNum;
        incomeData.push([ `  ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)` }]);
    });
    const expenseEndRow = incomeData.length;
    incomeData.push([ {v: "Total Beban", s:boldStyle}, { t: 'n', f: `SUM(B${expenseStartRow}:B${expenseEndRow})`, s:boldStyle} ]);
    const totalExpensesRow = incomeData.length;

    incomeData.push([]);
    incomeData.push([ {v: "Laba Bersih", s:{...boldStyle, sz: 12}}, { t: 'n', f: `B${totalRevenueRow}-B${totalExpensesRow}`, s:{...boldStyle, sz: 12}} ]);
    const netIncomeRow = incomeData.length;
    
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    wsIncome['!cols'] = [{wch: 40}, {wch: 20}, {wch: 10}, {wch: 15}];
    applyNumberFormatting(wsIncome, [1]);
    applyTableBorders(wsIncome);
    XLSX.utils.book_append_sheet(wb, wsIncome, incomeSheetName);

    // --- 3. Neraca ---
    const balanceSheetName = "Neraca";
    const balanceSheetData: any[] = [
      [{v: companyName, s:headerStyle}, "", backMenuBtn], [{v: balanceSheetName, s:subHeaderStyle}], [{v: `Per Tanggal Cetak: ${today}`, s:dateStyle}], [],
      [{v:"Aset", s:boldStyle}]
    ];

    let r_Kas = 0, r_Bank = 0, r_Peralatan = 0, r_AsetTakBerwujud = 0, r_Piutang = 0, r_Persediaan = 0;
    let r_UtangUsaha = 0, r_UtangBank = 0;

    const assetStartRow = balanceSheetData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Assets').forEach(acc => {
        const rowNum = balanceSheetData.length + 1;
        if(acc.name === 'Kas') r_Kas = rowNum;
        if(acc.name === 'Bank') r_Bank = rowNum;
        if(acc.name === 'Peralatan') r_Peralatan = rowNum;
        if(acc.name === 'Aset Tak Berwujud') r_AsetTakBerwujud = rowNum;
        if(acc.name === 'Piutang Usaha') r_Piutang = rowNum;
        if(acc.name === 'Persediaan Barang Dagang') r_Persediaan = rowNum;
        
        balanceSheetData.push([ `  ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)` }]);
    });
    const assetEndRow = balanceSheetData.length;
    balanceSheetData.push([ {v: "Total Aset", s:boldStyle}, { t: 'n', f: `SUM(B${assetStartRow}:B${assetEndRow})`, s:boldStyle} ]);
    
    balanceSheetData.push([]);
    balanceSheetData.push([{v:"Kewajiban & Ekuitas", s:boldStyle}]);
    balanceSheetData.push([{v:"  Kewajiban", s:boldStyle}]);
    
    const liabilityStartRow = balanceSheetData.length + 1;
    CHART_OF_ACCOUNTS.filter(a => a.type === 'Liabilities').forEach(acc => {
        const rowNum = balanceSheetData.length + 1;
        if(acc.name === 'Utang Usaha') r_UtangUsaha = rowNum;
        if(acc.name === 'Utang Bank') r_UtangBank = rowNum;
        balanceSheetData.push([`    ${acc.name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${acc.name}",'${journalSheetName}'!E:E)` }]);
    });
    const liabilityEndRow = balanceSheetData.length;
    
    balanceSheetData.push([{v:"  Ekuitas", s:boldStyle}]);
    const equityStartRow = balanceSheetData.length + 1;
    const r_Modal = balanceSheetData.length + 1;
    balanceSheetData.push([`    Modal Pemilik`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!E:E)` }]);
    const r_LabaDitahan = balanceSheetData.length + 1;
    balanceSheetData.push([`    Laba Ditahan`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!E:E)` }]);
    balanceSheetData.push([`    Laba Bersih (Periode Berjalan)`, { t: 'n', f: `'${incomeSheetName}'!B${netIncomeRow}` }]);
    const r_Prive = balanceSheetData.length + 1;
    balanceSheetData.push([`    Prive`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!F:F)` }]);
    const equityEndRow = balanceSheetData.length;
    
    const totalLiabilitiesFormula = liabilityStartRow > liabilityEndRow ? "0" : `SUM(B${liabilityStartRow}:B${liabilityEndRow})`;
    const totalEquityFormula = `+B${equityStartRow}+B${equityStartRow+1}+B${equityStartRow+2}-B${equityStartRow+3}`;
    
    balanceSheetData.push([ {v: "Total Kewajiban & Ekuitas", s:boldStyle}, { t: 'n', f: `${totalLiabilitiesFormula}${totalEquityFormula}`, s:boldStyle} ]);

    const wsBalance = XLSX.utils.aoa_to_sheet(balanceSheetData);
    wsBalance['!cols'] = [{wch: 40}, {wch: 20}, {wch: 10}, {wch: 15}];
    applyNumberFormatting(wsBalance, [1]);
    applyTableBorders(wsBalance);
    XLSX.utils.book_append_sheet(wb, wsBalance, balanceSheetName);


    // --- 4. Laporan Arus Kas (Indirect Method - DYNAMIC) ---
    const cashFlowSheetName = "Arus Kas";
    const cashFlowData: any[] = [
        [{v: companyName, s:headerStyle}, "", backMenuBtn], [{v: "Laporan Arus Kas (Indirect Method)", s:subHeaderStyle}], [{v: `Per Tanggal Cetak: ${today}`, s:dateStyle}], [],
        
        [{v: "Aktivitas Operasi", s: boldStyle}],
        ["  Laba Bersih", {t:'n', f:`'${incomeSheetName}'!B${netIncomeRow}`}],
        ["  Penyesuaian Penyusutan", {t:'n', f: r_BebanPenyusutan ? `'${incomeSheetName}'!B${r_BebanPenyusutan}` : `0`}],
        ["  Penyesuaian Amortisasi", {t:'n', f: r_BebanAmortisasi ? `'${incomeSheetName}'!B${r_BebanAmortisasi}` : `0`}],
        ["  Penurunan / (Kenaikan) Piutang Usaha", {t:'n', f:`-'${balanceSheetName}'!B${r_Piutang}`}],
        ["  Penurunan / (Kenaikan) Persediaan", {t:'n', f:`-'${balanceSheetName}'!B${r_Persediaan}`}],
        ["  Kenaikan / (Penurunan) Utang Usaha", {t:'n', f:`'${balanceSheetName}'!B${r_UtangUsaha}`}],
    ];
    const r_OpStart = 6;
    const r_OpEnd = cashFlowData.length;
    cashFlowData.push([{v: "Kas Bersih dari Aktivitas Operasi", s: boldStyle}, {t:'n', f:`SUM(B${r_OpStart}:B${r_OpEnd})`}]);
    const r_OpTotal = cashFlowData.length;
    
    cashFlowData.push([]); 
    cashFlowData.push([{v: "Aktivitas Investasi", s: boldStyle}]); 
    const r_InvStart = cashFlowData.length + 1;
    cashFlowData.push(["  Pembelian Peralatan", {t:'n', f:`-'${balanceSheetName}'!B${r_Peralatan}`}]); 
    cashFlowData.push(["  Pembelian Aset Tak Berwujud", {t:'n', f:`-'${balanceSheetName}'!B${r_AsetTakBerwujud}`}]); 
    const r_InvEnd = cashFlowData.length;
    cashFlowData.push([{v: "Kas Bersih dari Aktivitas Investasi", s: boldStyle}, {t:'n', f:`SUM(B${r_InvStart}:B${r_InvEnd})`}]); 
    const r_InvTotal = cashFlowData.length;

    cashFlowData.push([]); 
    cashFlowData.push([{v: "Aktivitas Pendanaan", s: boldStyle}]); 
    const r_FinStart = cashFlowData.length + 1;
    cashFlowData.push(["  Penerimaan Pinjaman Bank", {t:'n', f:`'${balanceSheetName}'!B${r_UtangBank}`}]); 
    cashFlowData.push(["  Tambahan Modal Disetor", {t:'n', f:`'${balanceSheetName}'!B${r_Modal}`}]); 
    cashFlowData.push(["  Laba Ditahan (Masa Lalu)", {t:'n', f:`'${balanceSheetName}'!B${r_LabaDitahan}`}]); 
    cashFlowData.push(["  (Penarikan Prive)", {t:'n', f:`-'${balanceSheetName}'!B${r_Prive}`}]); 
    const r_FinEnd = cashFlowData.length;
    cashFlowData.push([{v: "Kas Bersih dari Aktivitas Pendanaan", s: boldStyle}, {t:'n', f:`SUM(B${r_FinStart}:B${r_FinEnd})`}]); 
    const r_FinTotal = cashFlowData.length;

    cashFlowData.push([]); 
    cashFlowData.push([{v: "Kenaikan (Penurunan) Bersih Kas", s:boldStyle}, {t:'n', f:`B${r_OpTotal}+B${r_InvTotal}+B${r_FinTotal}`}]); 
    cashFlowData.push(["Saldo Kas & Bank Awal", {t:'n', v: 0}]); 
    cashFlowData.push([{v: "Saldo Kas & Bank Akhir", s:boldStyle}, {t:'n', f:`B${cashFlowData.length-1}+B${cashFlowData.length}`}]); 
    cashFlowData.push(["[Pengecekan ke Neraca Kas+Bank]", {t:'n', f:`'${balanceSheetName}'!B${r_Kas}+'${balanceSheetName}'!B${r_Bank}`, s: dateStyle}]);

    const wsCashFlow = XLSX.utils.aoa_to_sheet(cashFlowData);
    wsCashFlow['!cols'] = [{wch: 45}, {wch: 20}, {wch: 10}, {wch: 15}];
    applyNumberFormatting(wsCashFlow, [1]);
    applyTableBorders(wsCashFlow);
    XLSX.utils.book_append_sheet(wb, wsCashFlow, cashFlowSheetName);

    // --- 5. Buku Besar ---
    CHART_OF_ACCOUNTS.forEach(accountInfo => {
        const ledgerSheetName = sanitizeSheetName(accountInfo.name);
        const ledgerSheetData: any[] = [
            [{v: companyName, s:headerStyle}], [{v: `Buku Besar: ${accountInfo.name}`, s:subHeaderStyle}], [{v: `Per Tanggal Cetak: ${today}`, s:dateStyle}], [],
            ["Tanggal", "ID", "Akun", "Deskripsi", "Debit", "Kredit", "Saldo", backMenuBtn],
        ];
        
        const wsLedger = XLSX.utils.aoa_to_sheet(ledgerSheetData);
        
        const isNormalDebit = ['Assets', 'Expenses'].includes(accountInfo.type) || accountInfo.name === 'Prive';
        const filteredEntries = reportData.generalJournal.journalEntries.filter(entry => entry.accountName === accountInfo.name);
        let runningSaldo = 0;

        for (let i = 0; i < 500; i++) {
            const rowRef = 6 + i; 
            const prevRowRef = rowRef - 1;
            
            const createCol = (colStr: string) => 
                `IFERROR(INDEX('${journalSheetName}'!${colStr}:${colStr}, MATCH("${accountInfo.name}" & (ROW()-5), '${journalSheetName}'!H:H, 0)), "")`;

            let saldoFormula = "";
            if (isNormalDebit) {
                if (i === 0) saldoFormula = `IF(A${rowRef}="","",E${rowRef}-F${rowRef})`;
                else saldoFormula = `IF(A${rowRef}="","",G${prevRowRef}+E${rowRef}-F${rowRef})`;
            } else {
                if (i === 0) saldoFormula = `IF(A${rowRef}="","",F${rowRef}-E${rowRef})`;
                else saldoFormula = `IF(A${rowRef}="","",G${prevRowRef}+F${rowRef}-E${rowRef})`;
            }
            
            const entry = filteredEntries[i];
            let rowData;

            if (entry) {
                const vTanggal = format(new Date(entry.date), 'yyyy-MM-dd');
                const vID = entry.id;
                const vAkun = entry.accountName;
                const vDeskripsi = entry.description;
                const vDebit = entry.entryType === 'Debit' ? entry.amount : 0;
                const vKredit = entry.entryType === 'Credit' ? entry.amount : 0;

                runningSaldo += isNormalDebit ? (vDebit - vKredit) : (vKredit - vDebit);
                
                rowData = [
                    { t: 's', v: vTanggal, f: createCol('A') },
                    { t: 's', v: vID, f: createCol('B') },
                    { t: 's', v: vAkun, f: createCol('C') },
                    { t: 's', v: vDeskripsi, f: createCol('D') },
                    { t: 'n', v: vDebit, f: createCol('E') },
                    { t: 'n', v: vKredit, f: createCol('F') },
                    { t: 'n', v: runningSaldo, f: saldoFormula }
                ];
            } else {
                rowData = [
                    { f: createCol('A') },
                    { f: createCol('B') },
                    { f: createCol('C') },
                    { f: createCol('D') },
                    { t: 'n', f: createCol('E') },
                    { t: 'n', f: createCol('F') },
                    { t: 'n', f: saldoFormula }
                ];
            }

            XLSX.utils.sheet_add_aoa(wsLedger, [rowData], {origin: `A${rowRef}`});
        }
        
        wsLedger['!cols'] = [{wch: 12}, {wch: 10}, {wch: 25}, {wch: 40}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}];
        applyNumberFormatting(wsLedger, [4, 5, 6]); 
        applyTableBorders(wsLedger);
        XLSX.utils.book_append_sheet(wb, wsLedger, ledgerSheetName);
    });

    // --- 6. Audit & Investor Metrics ---
    const auditSheetName = "Audit & Investor";
    
    const auditData: any[] = [
       [{v: companyName, s:headerStyle}, "", "", "", backMenuBtn], 
       [{v: "Laporan Executive Audit & Investor", s:subHeaderStyle}, "", ""], 
       [{v: `Per Tanggal Cetak: ${today}`, s:dateStyle}, "", ""], 
       [],
       [{v: "Kesimpulan Analisis Sistem", s:boldStyle}, "", "Keterangan"],
       
       ["Status Kesehatan", { t: 'str', f: `IF(B12=0,"EMPTY",IF(B10<B17,"CRITICAL ALERT (REVENUE UNDER BEP)",IF(B19<0.15,"WARNING (MARGIN OF SAFETY RENDAH)",IF(AND(B26>0.20,B19>0.30),"KEUANGAN SANGAT PRIMA (HIGH ROI)","SEHAT & PROFITABLE")))))`}, "-"],
       ["Deskripsi", { t: 'str', f: `IF(B12=0,"Belum ada data operasional.",IF(B10<B17,"Perusahaan saat ini mengalami kerugian operasional dan belum mencapai Titik Impas (BEP).",IF(B19<0.15,"Perusahaan berhasil melewati level impas, namun berada dalam batas rentan.",IF(AND(B26>0.20,B19>0.30),"Pengembalian modal (ROI) sangat memuaskan, margin of safety aman. Risiko rendah.","Fundamental operasional sehat. Pendapatan berada di level yang aman di atas Titik Impas."))))`}, "-"],
       [], 
       [{v: "Komponen Operasional", s:boldStyle}, "", "Rumus Terintegrasi"],
       ["Total Pendapatan", { t: 'n', f: `'${incomeSheetName}'!B${totalRevenueRow}` }, "Dari Total Laba Rugi"],
       ["Total Biaya Variabel (HPP)", { t: 'n', f: r_HPP ? `'${incomeSheetName}'!B${r_HPP}` : `0` }, "Diambil dari HPP"],
       ["Total Biaya Tetap (Fixed Cost)", { t: 'n', f: `IF(B10>0, '${incomeSheetName}'!B${totalExpensesRow} - B11, 0)` }, "Total Beban - Biaya Variabel"],
       ["Margin Kontribusi", { t: 'n', f: `IF(B10>0, B10 - B11, 0)` }, "Pendapatan - Biaya Variabel"],
       ["Rasio Margin Kontribusi", { t: 'n', f: `IF(B10>0, B13/B10, 0)` }, "Margin Kontribusi / Pendapatan"],
       [], 
       [{v: "Indikator Target & Titik Impas (BEP)", s:boldStyle}, "", "Rumus Terintegrasi"],
       ["Titik Impas (BEP Rupiah)", { t: 'n', f: `IF(B14>0, B12/B14, 0)` }, "Biaya Tetap / Rasio Margin Kont."],
       ["Batas Aman (Margin of Safety Rp)", { t: 'n', f: `IF(B10>0, B10 - B17, 0)` }, "Pendapatan - Titik Impas (BEP)"],
       ["Batas Aman (Margin of Safety %)", { t: 'n', f: `IF(B10>0, B18/B10, 0)` }, "MoS Rupiah / Pendapatan"],
       [], 
       [{v: "Kinerja Investasi (ROI & ROA)", s:boldStyle}, "", "Rumus Terintegrasi"],
       ["Modal Pemilik (Owner Equity)", { t: 'n', f: `'${balanceSheetName}'!B${r_Modal}` }, "Total Modal Disetor"],
       ["Laba Ditahan", { t: 'n', f: `'${balanceSheetName}'!B${r_LabaDitahan}` }, "Laba Ditahan Masa Lalu"],
       ["Total Ekuitas Penjamin", { t: 'n', f: `B22 + B23` }, "Modal Pemilik + Laba Ditahan"],
       ["Total Aset Tertanggung", { t: 'n', f: `'${balanceSheetName}'!B${assetEndRow + 1}` }, "Dari Total Aset Neraca"],
       ["Laba Bersih Saat Ini", { t: 'n', f: `'${incomeSheetName}'!B${netIncomeRow}` }, "Dari Total Laba Bersih"],
       ["Return on Investment (ROI)", { t: 'n', f: `IF(B24>0, B26/B24, 0)` }, "Laba Bersih / Total Ekuitas Penjamin"],
       ["Return on Asset (ROA)", { t: 'n', f: `IF(B25>0, B26/B25, 0)` }, "Laba Bersih / Total Aset Tertanggung"]
    ];

    const wsAudit = XLSX.utils.aoa_to_sheet(auditData);
    wsAudit['!cols'] = [{wch: 40}, {wch: 25}, {wch: 45}, {wch: 10}, {wch: 15}]; 
    applyNumberFormatting(wsAudit, [1]); 
    const percentageCells = ['B14', 'B19', 'B27', 'B28'];
    percentageCells.forEach(cell => {
      if(wsAudit[cell]) wsAudit[cell].z = '0.00%';
    });
    applyTableBorders(wsAudit);

    XLSX.utils.book_append_sheet(wb, wsAudit, auditSheetName);

    XLSX.writeFile(wb, "Laporan Keuangan FinansiaPro (Automated).xlsx");
  };

  const handlePrintPDF = async () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
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
      doc.text(`Tanggal Cetak: ${today}`, textOffsetX, 28);

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
            ...Object.entries(reportData.incomeStatement.revenues).map(([cat, amt]) => [{content: `  ${cat}`, styles: {cellPadding: {left: 5}}}, {content: formatCurrency(amt), styles: {halign: 'right'}}]),
            [{content:'Total Pendapatan', styles: {fontStyle: 'bold'}}, {content: formatCurrency(reportData.incomeStatement.totalRevenue), styles: {halign: 'right', fontStyle: 'bold'}}],
            [{content: 'Beban', styles: {fontStyle: 'bold'}}],
            ...Object.entries(reportData.incomeStatement.expenses).map(([cat, amt]) => [{content: `  ${cat}`, styles: {cellPadding: {left: 5}}}, {content: formatCurrency(amt), styles: {halign: 'right'}}]),
            [{content:'Total Beban', styles: {fontStyle: 'bold'}}, {content: formatCurrency(reportData.incomeStatement.totalExpenses), styles: {halign: 'right', fontStyle: 'bold'}}],
        ],
        foot: [[{content:'Laba Bersih', styles: {fontStyle: 'bold'}}, {content: formatCurrency(reportData.incomeStatement.netIncome), styles: {halign: 'right', fontStyle: 'bold'}}]],
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
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
        headStyles: { fillColor: primaryColor },
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
        headStyles: { fillColor: primaryColor },
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
                { content: entry.accountName, styles: { cellPadding: {left: entry.entryType === 'Credit' ? 8 : 2 }}},
                { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } }
             ]);
          });
          rows.push(['', {content: `(${firstEntry.description})`, colSpan: 3, styles: {textColor: [150, 150, 150], fontStyle: 'italic', cellPadding: {left: 8}}}]);
          
           if (cogsEntries.length > 0) {
                cogsEntries.forEach((entry) => {
                    rows.push([
                        '',
                        { content: entry.accountName, styles: { cellPadding: {left: entry.entryType === 'Credit' ? 8 : 2 }}},
                        { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                        { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } }
                    ]);
                });
                rows.push(['', {content: `(Mencatat HPP untuk penjualan)`, colSpan: 3, styles: {textColor: [150, 150, 150], fontStyle: 'italic', cellPadding: {left: 8}}}]);
           }

          return rows;
        }),
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
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
          ...reportData.cashFlow.operatingFlows.map(flow => [{ content: `  ${flow.name}`, styles: { cellPadding: { left: 5 } } }, { content: flow.amount < 0 ? `(${formatCurrency(Math.abs(flow.amount))})` : formatCurrency(flow.amount), styles: { halign: 'right' } }]),
          [{ content: 'Total Arus Kas dari Aktivitas Operasi', styles: { fontStyle: 'bold' } }, { content: reportData.cashFlow.totalOperating < 0 ? `(${formatCurrency(Math.abs(reportData.cashFlow.totalOperating))})` : formatCurrency(reportData.cashFlow.totalOperating), styles: { halign: 'right', fontStyle: 'bold' } }],
        ],
        foot: [
          ['Saldo Kas Awal', { content: formatCurrency(reportData.cashFlow.beginningCash), styles: { halign: 'right' } }],
          ['Saldo Kas Akhir', { content: formatCurrency(reportData.cashFlow.endingCash), styles: { halign: 'right', fontStyle: 'bold' } }]
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        footStyles: { fontStyle: 'bold' },
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
            headStyles: { fillColor: primaryColor },
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
        headStyles: { fillColor: primaryColor },
        styles: { cellPadding: 4 },
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

    doc.save('Laporan Keuangan FinansiaPro.pdf');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Laporan Keuangan"
        description="Hasilkan dan lihat laporan keuangan bisnis Anda."
      >
        <Button variant="outline" onClick={handleExportXLSX}>
          <Download className="mr-2 h-4 w-4" />
          Ekspor Semua (XLSX)
        </Button>
         <Button variant="outline" onClick={handlePrintPDF}>
          <Printer className="mr-2 h-4 w-4" />
          Cetak Semua (PDF)
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="income-statement">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-4">
            <TabsTrigger value="income-statement">Laporan Laba Rugi</TabsTrigger>
            <TabsTrigger value="balance-sheet">Neraca</TabsTrigger>
            <TabsTrigger value="general-journal">Jurnal Umum</TabsTrigger>
            <TabsTrigger value="cash-flow">Arus Kas</TabsTrigger>
            <TabsTrigger value="general-ledger">Buku Besar</TabsTrigger>
            <TabsTrigger value="audit-investor">Audit & Investor</TabsTrigger>
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
    </div>
  );
}
