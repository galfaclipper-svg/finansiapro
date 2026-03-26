

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
import { useAppState } from '@/hooks/use-app-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ReportsPage() {
  const { transactions, inventory, companyProfile } = useAppState();

  const reportData = useMemo(() => {
    // --- 1. Universal Journal Entry Generation ---
    let baseJournalEntries = transactions.flatMap(t => {
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
    transactions.forEach(t => {
      const isSale = t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan');
      if (isSale && t.itemId && t.quantity) {
        const item = MOCK_INVENTORY.find(i => i.id === t.itemId); // Use MOCK_INVENTORY as it holds the original cost
        if (item) {
          const cogsAmount = item.costPerUnit * t.quantity;
          if (cogsAmount > 0) {
            cogsEntries.push({ ...t, id: `${t.id}-cogs`, entryType: 'Debit', accountName: 'Harga Pokok Penjualan', amount: cogsAmount });
            cogsEntries.push({ ...t, id: `${t.id}-cogs`, entryType: 'Credit', accountName: 'Persediaan Barang Dagang', amount: cogsAmount });
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
      'Prive': accountBalances['Prive'] || 0, // Keep it positive here, will be subtracted in total
    };
    
    const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
    const totalEquity = (equityAccounts['Modal Pemilik'] || 0) + (equityAccounts['Laba Ditahan'] || 0) + netIncome - (equityAccounts['Prive'] || 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // General Journal Data
    const journalEntries = allJournalEntries.sort((a, b) => new Date(b.date).getTime() - new Date(b.id > b.id ? 1 : -1) || (a.entryType === 'Debit' ? -1 : 1));

    // Cash Flow Data
    const operatingFlows: { name: string, amount: number }[] = [];
    const investingFlows: { name: string, amount: number }[] = [];
    const financingFlows: { name: string, amount: number }[] = [];
    
    const cashTransactions = transactions.filter(t => !['Beban Penyusutan', 'Beban Amortisasi'].includes(t.category));
    
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
  }, [transactions, inventory]);

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
      for (let R = range.s.r + 1; R <= range.e.r; ++R) { // Start from row 2
        for (const C of cols) {
          const cell_address = {c: C, r: R};
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          const cell = ws[cell_ref];
          if (!cell || (cell.t !== 'n' && !cell.f)) continue;
          cell.z = `_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)`;
        }
      }
    };
    
    const headerStyle = {font:{bold:true, sz:16}};
    const subHeaderStyle = {font:{bold:true, sz:14}};
    const dateStyle = {font:{italic:true}};
    const boldStyle = {font:{bold:true}};

    // 1. Jurnal Umum
    const journalExportData: any[] = [
      ["Tanggal", "ID", "Akun", "Deskripsi", "Debit", "Kredit"]
    ];
    reportData.generalJournal.journalEntries.forEach(entry => {
        journalExportData.push([
            format(new Date(entry.date), 'yyyy-MM-dd'),
            entry.id,
            entry.accountName,
            entry.description,
            entry.entryType === 'Debit' ? entry.amount : 0,
            entry.entryType === 'Credit' ? entry.amount : 0
        ]);
    });
    const wsJournal = XLSX.utils.aoa_to_sheet(journalExportData);
    wsJournal['!cols'] = [{wch: 12}, {wch: 10}, {wch: 30}, {wch: 40}, {wch: 15}, {wch: 15}];
    applyNumberFormatting(wsJournal, [4, 5]);
    XLSX.utils.book_append_sheet(wb, wsJournal, journalSheetName);

    // 2. Laporan Laba Rugi
    const incomeSheetName = "Laba Rugi";
    const incomeData: any[] = [
      [{v: companyName, s:headerStyle}],
      [{v: incomeSheetName, s:subHeaderStyle}],
      [{v: `Per ${today}`, s:dateStyle}],
      [],
    ];
    let incomeRow = incomeData.length + 1;
    incomeData.push([{v:"Pendapatan", s:boldStyle}]);
    incomeRow++;
    const revenueStartRow = incomeRow;
    Object.keys(reportData.incomeStatement.revenues).forEach(cat => {
        incomeData.push([ `  ${cat}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!E:E)` }]);
        incomeRow++;
    });
    const revenueEndRow = incomeRow - 1;
    incomeData.push([ {v:"Total Pendapatan", s:boldStyle}, { t: 'n', f: `SUM(B${revenueStartRow}:B${revenueEndRow})`, s:boldStyle} ]);
    const totalRevenueRow = incomeRow;
    incomeRow+=2;
    incomeData.push([{v:"Beban", s:boldStyle}]);
    incomeRow++;
    const expenseStartRow = incomeRow;
    Object.keys(reportData.incomeStatement.expenses).forEach(cat => {
        incomeData.push([ `  ${cat}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!F:F)` }]);
        incomeRow++;
    });
    const expenseEndRow = incomeRow - 1;
    incomeData.push([ {v: "Total Beban", s:boldStyle}, { t: 'n', f: `SUM(B${expenseStartRow}:B${expenseEndRow})`, s:boldStyle} ]);
    const totalExpensesRow = incomeRow;
    incomeRow+=2;
    incomeData.push([ {v: "Laba Bersih", s:{...boldStyle, sz: 12}}, { t: 'n', f: `B${totalRevenueRow}-B${totalExpensesRow}`, s:{...boldStyle, sz: 12}} ]);
    const netIncomeRow = incomeRow;
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    wsIncome['!cols'] = [{wch: 40}, {wch: 20}];
    applyNumberFormatting(wsIncome, [1]);
    XLSX.utils.book_append_sheet(wb, wsIncome, incomeSheetName);

    // 3. Neraca
    const balanceSheetName = "Neraca";
    const balanceSheetData: any[] = [
      [{v: companyName, s:headerStyle}], [{v: balanceSheetName, s:subHeaderStyle}], [{v: `Per ${today}`, s:dateStyle}], [],
      [{v:"Aset", s:boldStyle}]
    ];
    let balanceRow = balanceSheetData.length + 1;
    const assetStartRow = balanceRow;
    const sortedAssetNames = Object.keys(reportData.balanceSheet.assets).sort((aName, bName) => {
        const aId = CHART_OF_ACCOUNTS.find(acc => acc.name === aName)?.id || '9999';
        const bId = CHART_OF_ACCOUNTS.find(acc => acc.name === bName)?.id || '9999';
        return aId.localeCompare(bId);
    });
    sortedAssetNames.forEach(name => {
        balanceSheetData.push([ `  ${name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!F:F)` }]);
        balanceRow++;
    });
    const assetEndRow = balanceRow - 1;
    balanceSheetData.push([ {v: "Total Aset", s:boldStyle}, { t: 'n', f: `SUM(B${assetStartRow}:B${assetEndRow})`, s:boldStyle} ]);
    balanceRow += 2;
    balanceSheetData.push([{v:"Kewajiban & Ekuitas", s:boldStyle}]);
    balanceRow++;
    
    balanceSheetData.push([{v:"  Kewajiban", s:boldStyle}]);
    balanceRow++;
    const liabilityStartRow = balanceRow;
    Object.keys(reportData.balanceSheet.liabilities).sort().forEach(name => {
        balanceSheetData.push([`    ${name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!E:E)` }]);
        balanceRow++;
    });
    const liabilityEndRow = balanceRow-1;
    
    balanceSheetData.push([{v:"  Ekuitas", s:boldStyle}]);
    balanceRow++;
    const equityStartRow = balanceRow;
    balanceSheetData.push([`    Modal Pemilik`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!E:E)` }]);
    balanceRow++;
    balanceSheetData.push([`    Laba Ditahan`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Laba Ditahan",'${journalSheetName}'!E:E)` }]);
    balanceRow++;
    balanceSheetData.push([`    Laba Bersih (Periode Berjalan)`, { t: 'n', f: `'${incomeSheetName}'!B${netIncomeRow}` }]);
    balanceRow++;
    balanceSheetData.push([`    Prive`, { t: 'n', f: `(SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!F:F))` }]);
    balanceRow++;
    const equityEndRow = balanceRow-1;
    
    const totalLiabilitiesFormula = liabilityStartRow > liabilityEndRow ? "0" : `SUM(B${liabilityStartRow}:B${liabilityEndRow})`;
    const totalEquityFormula = `SUM(B${equityStartRow}:B${equityEndRow})`;
    
    balanceSheetData.push([ {v: "Total Kewajiban & Ekuitas", s:boldStyle}, { t: 'n', f: `${totalLiabilitiesFormula}+${totalEquityFormula}`, s:boldStyle} ]);
    const wsBalance = XLSX.utils.aoa_to_sheet(balanceSheetData);
    wsBalance['!cols'] = [{wch: 40}, {wch: 20}];
    applyNumberFormatting(wsBalance, [1]);
    XLSX.utils.book_append_sheet(wb, wsBalance, balanceSheetName);

    // 4. Laporan Arus Kas
    const cashFlowSheetName = "Arus Kas";
    const cashFlowData = [
        [{v: companyName, s:headerStyle}], [{v: "Laporan Arus Kas", s:subHeaderStyle}], [{v: `Per ${today}`, s:dateStyle}], [],
        [{v: "Aktivitas Operasi", s: boldStyle}],
        ...reportData.cashFlow.operatingFlows.map(i => [`  ${i.name}`, i.amount]),
        [{v: "Total Arus Kas dari Aktivitas Operasi", s: boldStyle}, {t:'n', f:`SUM(B6:B${5+reportData.cashFlow.operatingFlows.length})`}],
        [],
        [{v: "Aktivitas Investasi", s: boldStyle}],
        ...reportData.cashFlow.investingFlows.map(i => [`  ${i.name}`, i.amount]),
        [{v: "Total Arus Kas dari Aktivitas Investasi", s: boldStyle}, {t:'n', f:`SUM(B${8+reportData.cashFlow.operatingFlows.length}:B${7+reportData.cashFlow.operatingFlows.length+reportData.cashFlow.investingFlows.length})`}],
        [],
        [{v: "Aktivitas Pendanaan", s: boldStyle}],
        ...reportData.cashFlow.financingFlows.map(i => [`  ${i.name}`, i.amount]),
        [{v: "Total Arus Kas dari Aktivitas Pendanaan", s: boldStyle}, {t:'n', f:`SUM(B${10+reportData.cashFlow.operatingFlows.length+reportData.cashFlow.investingFlows.length}:B${9+reportData.cashFlow.operatingFlows.length+reportData.cashFlow.investingFlows.length+reportData.cashFlow.financingFlows.length})`}],
        [],
        [{v: "Kenaikan (Penurunan) Bersih Kas", s:boldStyle}, {t:'n', f:`B${7+reportData.cashFlow.operatingFlows.length}+B${9+reportData.cashFlow.operatingFlows.length+reportData.cashFlow.investingFlows.length}+B${11+reportData.cashFlow.operatingFlows.length+reportData.cashFlow.investingFlows.length+reportData.cashFlow.financingFlows.length}`}],
        ["Saldo Kas Awal", reportData.cashFlow.beginningCash],
        [{v: "Saldo Kas Akhir", s:boldStyle}, {t:'n', f:`B${13+reportData.cashFlow.operatingFlows.length+reportData.cashFlow.investingFlows.length+reportData.cashFlow.financingFlows.length}+B${14+reportData.cashFlow.operatingFlows.length+reportData.cashFlow.investingFlows.length+reportData.cashFlow.financingFlows.length}`}],
    ];
    const wsCashFlow = XLSX.utils.aoa_to_sheet(cashFlowData);
    wsCashFlow['!cols'] = [{wch: 40}, {wch: 20}];
    applyNumberFormatting(wsCashFlow, [1]);
    XLSX.utils.book_append_sheet(wb, wsCashFlow, cashFlowSheetName);

    // 5. Buku Besar
    reportData.generalLedger.sortedLedgerAccounts.forEach(account => {
        const ledgerSheetName = sanitizeSheetName(account.accountInfo.name);
        const ledgerSheetData = [
            [{v: companyName, s:headerStyle}], [{v: `Buku Besar: ${account.accountInfo.name}`, s:subHeaderStyle}], [{v: `Per ${today}`, s:dateStyle}], [],
            ["Tanggal", "Keterangan", "Debit", "Kredit", "Saldo"]
        ];
        
        account.entries.forEach((entry: any, index: number) => {
            const balanceFormula = index === 0
                ? `E5+C6-D6`
                : `E${5+index}+C${6+index}-D${6+index}`;
             const adjustedBalanceFormula = `C${6+index}-D${6+index}` + (index > 0 ? `+E${5+index}` : '');
            
            const isNormalDebit = ['Assets', 'Expenses'].includes(account.accountInfo.type) || account.accountInfo.name === 'Prive';
            const finalFormula = index === 0 
                ? (isNormalDebit ? `C6-D6` : `D6-C6`)
                : (isNormalDebit ? `E${5+index}+C${6+index}-D${6+index}` : `E${5+index}-C${6+index}+D${6+index}`);


            ledgerSheetData.push([
                format(new Date(entry.date), 'yyyy-MM-dd'),
                entry.description,
                entry.entryType === 'Debit' ? entry.amount : 0,
                entry.entryType === 'Credit' ? entry.amount : 0,
                {t:'n', f: finalFormula}
            ]);
        });
        const wsLedger = XLSX.utils.aoa_to_sheet(ledgerSheetData);
        wsLedger['!cols'] = [{wch: 12}, {wch: 40}, {wch: 15}, {wch: 15}, {wch: 15}];
        applyNumberFormatting(wsLedger, [2, 3, 4]);
        XLSX.utils.book_append_sheet(wb, wsLedger, ledgerSheetName);
    });


    XLSX.writeFile(wb, "Laporan Keuangan FinansiaPro (Formula).xlsx");
  };

  const handlePrintPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const companyName = companyProfile.name;
    const addHeaderFooter = (doc: jsPDF, title: string) => {
      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(companyName, 14, 20);
          doc.setFontSize(12);
          doc.text(title, 14, 27);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`Tanggal Cetak: ${today}`, 14, 34);
          doc.setFontSize(8);
          doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
    }

    // --- Page 1: Income Statement ---
    doc.text(companyName, 14, 20);
    doc.setFontSize(12);
    doc.text('Laporan Laba Rugi', 14, 27);
    autoTable(doc, {
        startY: 40,
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
        headStyles: { fillColor: [22, 163, 74] },
    });
    addHeaderFooter(doc, 'Laporan Laba Rugi');

    // --- Page 2: Balance Sheet ---
    doc.addPage();
    doc.text(companyName, 14, 20);
    doc.setFontSize(12);
    doc.text('Neraca', 14, 27);
    const sortedAssetEntries = Object.entries(reportData.balanceSheet.assets).sort(([aName], [bName]) => {
      const aId = CHART_OF_ACCOUNTS.find(acc => acc.name === aName)?.id || '9999';
      const bId = CHART_OF_ACCOUNTS.find(acc => acc.name === bName)?.id || '9999';
      return aId.localeCompare(bId);
    });
    autoTable(doc, {
        startY: 40,
        head: [['Aset', '']],
        body: sortedAssetEntries.map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
        foot: [[{content:'Total Aset', styles:{fontStyle:'bold'}}, {content: formatCurrency(reportData.balanceSheet.totalAssets), styles: {halign: 'right', fontStyle:'bold'}}]],
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
    });
     autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Kewajiban dan Ekuitas', '']],
        body: [
            ...Object.entries(reportData.balanceSheet.liabilities).map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
            ...Object.entries(reportData.balanceSheet.equity).map(([name, amount]) => [name, {content: name === 'Prive' ? `(${formatCurrency(Math.abs(amount as number))})` : formatCurrency(amount as number), styles: {halign: 'right'}}]),
        ],
        foot: [[{content:'Total Kewajiban dan Ekuitas', styles:{fontStyle:'bold'}}, {content: formatCurrency(reportData.balanceSheet.totalLiabilitiesAndEquity), styles: {halign: 'right', fontStyle:'bold'}}]],
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
    });
    addHeaderFooter(doc, 'Neraca');

    // --- Page 3: General Journal ---
    doc.addPage();
    doc.text(companyName, 14, 20);
    doc.setFontSize(12);
    doc.text("Jurnal Umum", 14, 27);
    const groupedEntries = reportData.generalJournal.journalEntries.reduce((acc, entry) => {
        const key = entry.id.replace('-cogs', '');
        (acc[key] = acc[key] || []).push(entry);
        return acc;
    }, {} as Record<string, any[]>);
     autoTable(doc, {
        startY: 40,
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
        headStyles: { fillColor: [22, 163, 74] },
    });
    addHeaderFooter(doc, 'Jurnal Umum');

     // --- Page 4: Cash Flow ---
    doc.addPage();
    doc.text(companyName, 14, 20);
    doc.setFontSize(12);
    doc.text('Laporan Arus Kas', 14, 27);
    autoTable(doc, {
        startY: 40,
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
        headStyles: { fillColor: [22, 163, 74] },
        footStyles: { fontStyle: 'bold' },
    });
    addHeaderFooter(doc, 'Laporan Arus Kas');

     // --- Page 5..N: General Ledger ---
    reportData.generalLedger.sortedLedgerAccounts.forEach(account => {
        doc.addPage();
        doc.text(companyName, 14, 20);
        doc.setFontSize(12);
        doc.text(`Buku Besar: ${account.accountInfo.name}`, 14, 27);
         autoTable(doc, {
            startY: 40,
            head: [['Tanggal', 'Keterangan', 'Debit', 'Kredit', 'Saldo']],
            body: account.entries.map((entry: any) => [
                format(new Date(entry.date), 'd MMM y', { locale: id }),
                entry.description,
                { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                { content: formatCurrency(entry.balance), styles: { halign: 'right' } },
            ]),
            foot: [[{content: '', colSpan: 4}, {content: '', styles: {halign: 'right'}}]], // Empty footer for space
            didParseCell: (data) => {
              // Add a summary row at the bottom of the table, inside the last cell.
              if (data.row.index === account.entries.length -1 && data.column.index === data.table.columns.length -1) {
                data.cell.styles.fontStyle = 'bold';
              }
            },
            didDrawPage: (data) => {
                // Add final balance footer at the bottom of the page
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                const finalY = (doc as any).lastAutoTable.finalY || data.cursor.y;
                doc.text('Saldo Akhir', 125, finalY + 10, {align: 'right'});
                doc.text(formatCurrency(account.balance), data.table.width, finalY + 10, {align: 'right'});
            }
        });
        addHeaderFooter(doc, `Buku Besar: ${account.accountInfo.name}`);
    });

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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-4">
            <TabsTrigger value="income-statement">Laporan Laba Rugi</TabsTrigger>
            <TabsTrigger value="balance-sheet">Neraca</TabsTrigger>
            <TabsTrigger value="general-journal">Jurnal Umum</TabsTrigger>
            <TabsTrigger value="cash-flow">Arus Kas</TabsTrigger>
            <TabsTrigger value="general-ledger">Buku Besar</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
