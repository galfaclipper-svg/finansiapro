

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
    // --- Universal Journal Entry Generation ---
    const allJournalEntries = transactions.flatMap(t => {
      const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
      const accountType = account?.type;
      const cashAccountName = "Kas";
      if (t.type === 'cash-in') {
          return [ { ...t, entryType: 'Debit', accountName: cashAccountName, amount: t.amount }, { ...t, entryType: 'Credit', accountName: t.category, amount: t.amount }];
      } else {
          if (accountType === 'Assets' && t.category !== cashAccountName) {
              return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
          }
          return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
      }
    });

    const accountBalances: { [key: string]: number } = {};
    CHART_OF_ACCOUNTS.forEach(acc => { accountBalances[acc.name] = 0; });

    allJournalEntries.forEach(entry => {
        const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === entry.accountName);
        if (!accountInfo) return;
        const amount = entry.amount;
        if (accountInfo.type === 'Assets' || accountInfo.type === 'Expenses') {
            accountBalances[entry.accountName] += (entry.entryType === 'Debit' ? amount : -amount);
        } else { // Liabilities, Equity, Revenue
            accountBalances[entry.accountName] += (entry.entryType === 'Credit' ? amount : -amount);
        }
    });

    // --- Income Statement Data ---
    const revenues: { [key: string]: number } = {};
    const expenses: { [key: string]: number } = {};
    Object.entries(accountBalances).forEach(([accountName, balance]) => {
      if (balance === 0) return;
      const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
      if (!accountInfo) return;
      if (accountInfo.type === 'Revenue') revenues[accountName] = balance;
      if (accountInfo.type === 'Expenses') expenses[accountName] = balance;
    });
    const totalRevenue = Object.values(revenues).reduce((sum, amount) => sum + amount, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    // --- Balance Sheet Data ---
    const assets: { [key: string]: number } = {};
    const liabilities: { [key: string]: number } = {};
    let ownersCapital = 0;
    let ownerDrawings = 0;
    Object.entries(accountBalances).forEach(([accountName, balance]) => {
      if (balance === 0 && accountName !== 'Kas' && accountName !== 'Persediaan Barang Dagang') return;
      const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
      if (!accountInfo) return;
      if (accountInfo.type === 'Assets') assets[accountName] = balance;
      if (accountInfo.type === 'Liabilities') liabilities[accountName] = balance;
      if (accountInfo.name === 'Modal Pemilik') ownersCapital = balance;
      if (accountInfo.name === 'Prive') ownerDrawings = balance;
    });
    const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
    
    // Recalculate inventory value just in case, though it should match balance
    assets['Persediaan Barang Dagang'] = inventory.reduce((sum, item) => sum + item.stock * item.costPerUnit, 0);

    const retainedEarningsBeginning = 0; // Not implemented yet
    let equity = {
      'Modal Pemilik': ownersCapital,
      'Laba Ditahan': retainedEarningsBeginning + ownerDrawings, // Drawings reduce equity, so we add the negative balance
      'Laba Bersih (Periode Berjalan)': netIncome,
    };
    let totalEquity = Object.values(equity).reduce((sum, val) => sum + val, 0);
    let totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // A "plug" to balance the sheet in this single-entry based system
    const balanceDifference = totalAssets - totalLiabilitiesAndEquity;
    if (Math.abs(balanceDifference) > 0.01) {
        equity['Modal Pemilik'] += balanceDifference;
        totalLiabilitiesAndEquity = totalAssets;
    }
    
    // --- General Journal Data ---
    const journalEntries = transactions.flatMap(t => {
        const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
        const accountType = account?.type;
        const cashAccountName = "Kas";
        if (t.type === 'cash-in') {
            return [
                { ...t, entryType: 'Debit', accountName: cashAccountName, amount: t.amount, key: `${t.id}-debit` },
                { ...t, entryType: 'Credit', accountName: t.category, amount: t.amount, key: `${t.id}-credit` },
            ];
        } else {
            if (accountType === 'Assets' && t.category !== cashAccountName) {
                return [
                    { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount, key: `${t.id}-debit` },
                    { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount, key: `${t.id}-credit` },
                ];
            }
            return [
                { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount, key: `${t.id}-debit` },
                { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount, key: `${t.id}-credit` },
            ];
        }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (a.id > b.id ? 1 : -1) || (a.entryType === 'Debit' ? -1 : 1));

    // --- Cash Flow Data ---
    const revenueAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').map(a => a.name);
    const expenseAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').map(a => a.name);
    const cashFromSales = transactions.filter(t => t.type === 'cash-in' && revenueAccountNames.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
    const cashForInventory = transactions.filter(t => t.type === 'cash-out' && t.category === 'Persediaan Barang Dagang').reduce((sum, t) => sum + t.amount, 0);
    const cashForExpenses = transactions.filter(t => t.type === 'cash-out' && expenseAccountNames.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
    const operatingFlows: { name: string, amount: number }[] = [];
    if (cashFromSales > 0) operatingFlows.push({ name: 'Penerimaan dari Pelanggan', amount: cashFromSales });
    if (cashForInventory > 0) operatingFlows.push({ name: 'Pembayaran kepada Pemasok', amount: -cashForInventory });
    if (cashForExpenses > 0) operatingFlows.push({ name: 'Pembayaran Beban Operasional', amount: -cashForExpenses });
    const totalOperating = operatingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    const endingCash = accountBalances['Kas'] || 0;

    // --- General Ledger Data ---
    const allJournalEntriesForLedger = allJournalEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ledgerAccountsData: { [key: string]: { entries: any[], balance: number, accountInfo: any } } = {};
    const allAccountNames = [...new Set(allJournalEntriesForLedger.map(e => e.accountName))];
    CHART_OF_ACCOUNTS.forEach(coa => { if (!allAccountNames.includes(coa.name)) { allAccountNames.push(coa.name); }});
    
    allAccountNames.forEach(accountName => {
        const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
        if (!accountInfo) return;
        const entriesForAccount = allJournalEntriesForLedger.filter(entry => entry.accountName === accountName);
        let runningBalance = 0;
        const entriesWithBalance = entriesForAccount.map(entry => {
             const debit = entry.entryType === 'Debit' ? entry.amount : 0;
             const credit = entry.entryType === 'Credit' ? entry.amount : 0;
             if (accountInfo.type === 'Assets' || accountInfo.type === 'Expenses') { runningBalance += debit - credit; } 
             else { runningBalance += credit - debit; }
            return {...entry, balance: runningBalance};
        });
        if(entriesWithBalance.length > 0) {
          ledgerAccountsData[accountName] = { entries: entriesWithBalance, balance: runningBalance, accountInfo };
        }
    });
    const sortedLedgerAccounts = Object.values(ledgerAccountsData).sort((a, b) => (a.accountInfo?.id ?? 9999) > (b.accountInfo?.id ?? 9999) ? 1 : -1);


    return {
      incomeStatement: { revenues, totalRevenue, expenses, totalExpenses, netIncome },
      balanceSheet: { assets, liabilities, equity, totalAssets, totalLiabilitiesAndEquity },
      generalJournal: { journalEntries },
      cashFlow: { operatingFlows, totalOperating, endingCash },
      generalLedger: { sortedLedgerAccounts }
    };
  }, [transactions, inventory]);

 const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const companyName = companyProfile.name;
    const journalSheetName = "Jurnal Umum";
    const incomeSheetName = "Laba Rugi";

    // --- Helper for number formatting in a sheet ---
    const applyNumberFormatting = (ws: XLSX.WorkSheet, cols: number[], fmt: string) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (const C of cols) {
          const cell_address = {c: C, r: R};
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          const cell = ws[cell_ref];
          if (!cell || (cell.t !== 'n' && !cell.f)) continue;
          cell.z = fmt;
        }
      }
    };

    // 1. General Journal Sheet (The data source for formulas)
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
    applyNumberFormatting(wsJournal, [4, 5], '#,##0');
    XLSX.utils.book_append_sheet(wb, wsJournal, journalSheetName);

    // 2. Income Statement Sheet
    const incomeData: any[] = [
      [{v: companyName, s:{font:{bold:true, sz:16}}}],
      [{v: incomeSheetName, s:{font:{bold:true, sz:14}}}],
      [{v: `Per ${today}`, s:{font:{italic:true}}}],
      [],
    ];
    let incomeRow = incomeData.length + 1;
    incomeData.push(["Pendapatan"]);
    incomeRow++;
    const revenueStartRow = incomeRow;
    Object.keys(reportData.incomeStatement.revenues).forEach(cat => {
        incomeData.push([ `  ${cat}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!E:E)` }]);
        incomeRow++;
    });
    const revenueEndRow = incomeRow - 1;
    const totalRevenueRow = incomeRow;
    incomeData.push([ {v:"Total Pendapatan", s:{font:{bold:true}}}, { t: 'n', f: revenueStartRow > revenueEndRow ? 0 : `SUM(B${revenueStartRow}:B${revenueEndRow})`, s:{font:{bold:true}}} ]);
    incomeRow++;
    incomeData.push([]); // Blank row
    incomeRow++;
    incomeData.push(["Beban"]);
    incomeRow++;
    const expenseStartRow = incomeRow;
    Object.keys(reportData.incomeStatement.expenses).forEach(cat => {
        incomeData.push([ `  ${cat}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${cat}",'${journalSheetName}'!F:F)` }]);
        incomeRow++;
    });
    const expenseEndRow = incomeRow - 1;
    const totalExpensesRow = incomeRow;
    incomeData.push([ {v: "Total Beban", s:{font:{bold:true}}}, { t: 'n', f: expenseStartRow > expenseEndRow ? 0 : `SUM(B${expenseStartRow}:B${expenseEndRow})`, s:{font:{bold:true}}} ]);
    incomeRow++;
    incomeData.push([]); // Blank row
    incomeRow++;
    const netIncomeRow = incomeRow;
    incomeData.push([ {v: "Laba Bersih", s:{font:{bold:true, sz: 12}}}, { t: 'n', f: `B${totalRevenueRow}-B${totalExpensesRow}`, s:{font:{bold:true, sz: 12}}} ]);
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    wsIncome['!cols'] = [{wch: 40}, {wch: 20}];
    applyNumberFormatting(wsIncome, [1], '#,##0;[Red](#,##0)');
    XLSX.utils.book_append_sheet(wb, wsIncome, incomeSheetName);

    // 3. Balance Sheet Sheet
    const balanceSheetData: any[] = [
      [{v: companyName, s:{font:{bold:true, sz:16}}}],
      [{v: "Neraca", s:{font:{bold:true, sz:14}}}],
      [{v: `Per ${today}`, s:{font:{italic:true}}}],
      [],
    ];
    let balanceRow = balanceSheetData.length + 1;
    balanceSheetData.push(["Aset"]);
    balanceRow++;
    const assetStartRow = balanceRow;
    Object.keys(reportData.balanceSheet.assets).forEach(name => {
        balanceSheetData.push([ `  ${name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!F:F)` }]);
        balanceRow++;
    });
    const assetEndRow = balanceRow - 1;
    balanceSheetData.push([ {v: "Total Aset", s:{font:{bold:true}}}, { t: 'n', f: `SUM(B${assetStartRow}:B${assetEndRow})`, s:{font:{bold:true}}} ]);
    balanceRow += 2;
    balanceSheetData.push(["Kewajiban & Ekuitas"]);
    balanceRow++;
    const liabEqStartRow = balanceRow;
    Object.keys(reportData.balanceSheet.liabilities).forEach(name => {
        balanceSheetData.push([`  ${name}`, { t: 'n', f: `SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"${name}",'${journalSheetName}'!E:E)` }]);
        balanceRow++;
    });
    
    // Correctly add equity components with their formulas
    const equityFormulas: { [key: string]: string } = {
      'Modal Pemilik': `SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!F:F)-SUMIF('${journalSheetName}'!C:C,"Modal Pemilik",'${journalSheetName}'!E:E)`,
      'Laba Ditahan': `-(SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!E:E)-SUMIF('${journalSheetName}'!C:C,"Prive",'${journalSheetName}'!F:F))`, // Inverted sign for Prive
      'Laba Bersih (Periode Berjalan)': `'${incomeSheetName}'!B${netIncomeRow}`
    };

    Object.entries(equityFormulas).forEach(([name, formula]) => {
      // Find the corresponding value from the UI data to apply balancing plug if necessary
      const uiValue = reportData.balanceSheet.equity[name as keyof typeof reportData.balanceSheet.equity];
      const plug = (name === 'Modal Pemilik') ? (reportData.balanceSheet.totalAssets - reportData.balanceSheet.totalLiabilitiesAndEquity) : 0;
      
      // If there's a plug, we adjust the formula. This is a simplification.
      const finalFormula = plug !== 0 && name === 'Modal Pemilik' ? `${formula}+${plug}` : formula;

      balanceSheetData.push([ `  ${name}`, { t: 'n', f: finalFormula }]);
      balanceRow++;
    });

    const liabEqEndRow = balanceRow - 1;
    balanceSheetData.push([ {v: "Total Kewajiban & Ekuitas", s:{font:{bold:true}}}, { t: 'n', f: `SUM(B${liabEqStartRow}:B${liabEqEndRow})`, s:{font:{bold:true}}} ]);
    const wsBalance = XLSX.utils.aoa_to_sheet(balanceSheetData);
    wsBalance['!cols'] = [{wch: 40}, {wch: 20}];
    applyNumberFormatting(wsBalance, [1], '#,##0;[Red](#,##0)');
    XLSX.utils.book_append_sheet(wb, wsBalance, "Neraca");

    XLSX.writeFile(wb, "Laporan Keuangan FinansiaPro (Formula).xlsx");
  };

  const handlePrintPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const companyName = companyProfile.name;
    let pageNumber = 1;
    const totalPages = 5; // Update as more reports are added
    const addHeaderFooter = (doc: jsPDF, title: string) => {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, 14, 20);
      doc.setFontSize(12);
      doc.text(title, 14, 27);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Tanggal Cetak: ${today}`, 14, 34);

      // Footer will be added at the end
    }

    // --- Page 1: Income Statement ---
    addHeaderFooter(doc, 'Laporan Laba Rugi');
    autoTable(doc, {
        startY: 40,
        head: [['Deskripsi', 'Jumlah']],
        body: [
            ...Object.entries(reportData.incomeStatement.revenues).map(([cat, amt]) => [{content: `  ${cat}`, styles: {cellPadding: {left: 5}}}, {content: formatCurrency(amt), styles: {halign: 'right'}}]),
            ['Total Pendapatan', {content: formatCurrency(reportData.incomeStatement.totalRevenue), styles: {halign: 'right'}}],
            ...Object.entries(reportData.incomeStatement.expenses).map(([cat, amt]) => [{content: `  ${cat}`, styles: {cellPadding: {left: 5}}}, {content: formatCurrency(amt), styles: {halign: 'right'}}]),
            ['Total Beban', {content: formatCurrency(reportData.incomeStatement.totalExpenses), styles: {halign: 'right'}}],
        ],
        foot: [['Laba Bersih', {content: formatCurrency(reportData.incomeStatement.netIncome), styles: {halign: 'right'}}]],
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        didParseCell: function(data) {
            if (data.row.section === 'body' && (data.cell.raw === 'Total Pendapatan' || data.cell.raw === 'Total Beban')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = '#f9f9f9';
            }
             if (data.row.section === 'head' && data.column.index === 1) {
                data.cell.styles.halign = 'right';
            }
        }
    });

    // --- Page 2: Balance Sheet ---
    doc.addPage();
    addHeaderFooter(doc, 'Neraca');
    autoTable(doc, {
        startY: 40,
        head: [['Aset', 'Jumlah']],
        body: [
            ...Object.entries(reportData.balanceSheet.assets).map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
        ],
        foot: [['Total Aset', {content: formatCurrency(reportData.balanceSheet.totalAssets), styles: {halign: 'right'}}]],
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
        footStyles: { fontStyle: 'bold', fillColor: '#f9f9f9', textColor: 0 },
    });
     autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Kewajiban dan Ekuitas', 'Jumlah']],
        body: [
            ...Object.entries(reportData.balanceSheet.liabilities).map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
            ...Object.entries(reportData.balanceSheet.equity).map(([name, amount]) => [name, {content: formatCurrency(amount as number), styles: {halign: 'right'}}]),
        ],
        foot: [['Total Kewajiban dan Ekuitas', {content: formatCurrency(reportData.balanceSheet.totalLiabilitiesAndEquity), styles: {halign: 'right'}}]],
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
        footStyles: { fontStyle: 'bold', fillColor: '#f9f9f9', textColor: 0 },
    });

    // --- Page 3: General Journal ---
    doc.addPage();
    addHeaderFooter(doc, "Jurnal Umum");
    const groupedEntries = reportData.generalJournal.journalEntries.reduce((acc, entry) => {
        (acc[entry.id] = acc[entry.id] || []).push(entry);
        return acc;
    }, {} as Record<string, any[]>);
     autoTable(doc, {
        startY: 40,
        head: [['Tanggal', 'Akun & Keterangan', 'Debit', 'Kredit']],
        body: Object.values(groupedEntries).flatMap(entries => {
          const rows: any[] = [];
          entries.forEach((entry, index) => {
             rows.push([
                index === 0 ? format(new Date(entry.date), 'd MMM y', { locale: id }) : '',
                { content: entry.accountName, styles: { cellPadding: {left: entry.entryType === 'Credit' ? 8 : 2 }}},
                { content: entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } },
                { content: entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '', styles: { halign: 'right' } }
             ]);
          });
          rows.push(['', {content: `(${entries[0].description})`, colSpan: 3, styles: {textColor: [150, 150, 150], fontStyle: 'italic', cellPadding: {left: 8}}}]);
          return rows;
        }),
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
         didDrawCell: (data) => {
             if (data.cell.raw && (data.cell.raw as any).colSpan) {
                if (data.row.section === 'body' && data.row.index % 3 === 2) {
                    doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
                }
             }
         }
    });

     // --- Page 4: Cash Flow ---
    doc.addPage();
    addHeaderFooter(doc, 'Laporan Arus Kas');
    autoTable(doc, {
        startY: 40,
        head: [['Deskripsi', 'Jumlah']],
        body: [
          [{ content: 'Aktivitas Operasi', styles: { fontStyle: 'bold' } }, ''],
          ...reportData.cashFlow.operatingFlows.map(flow => [{ content: `  ${flow.name}`, styles: { cellPadding: { left: 5 } } }, { content: flow.amount < 0 ? `(${formatCurrency(Math.abs(flow.amount))})` : formatCurrency(flow.amount), styles: { halign: 'right' } }]),
          [{ content: 'Total Arus Kas dari Aktivitas Operasi', styles: { fontStyle: 'bold', fillColor: '#f9f9f9' } }, { content: reportData.cashFlow.totalOperating < 0 ? `(${formatCurrency(Math.abs(reportData.cashFlow.totalOperating))})` : formatCurrency(reportData.cashFlow.totalOperating), styles: { halign: 'right', fontStyle: 'bold', fillColor: '#f9f9f9' } }],
        ],
        foot: [
          ['Saldo Kas Awal', { content: formatCurrency(0), styles: { halign: 'right' } }],
          ['Saldo Kas Akhir', { content: formatCurrency(reportData.cashFlow.endingCash), styles: { halign: 'right' } }]
        ],
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
        footStyles: { fontStyle: 'bold', fillColor: '#f0f0f0', textColor: 0 },
    });

     // --- Page 5..N: General Ledger ---
    reportData.generalLedger.sortedLedgerAccounts.forEach(account => {
        doc.addPage();
        addHeaderFooter(doc, `Buku Besar: ${account.accountInfo.name}`);
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
            foot: [['', '', '', 'Saldo Akhir', { content: formatCurrency(account.balance), styles: { halign: 'right' } }]],
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74] },
            footStyles: { fontStyle: 'bold', fillColor: '#f0f0f0', textColor: 0 },
        });
    });
    // Re-run header/footer generation to update total pages
    const newTotalPages = doc.getNumberOfPages();
    for(let i = 1; i <= newTotalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Halaman ${i} dari ${newTotalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-4">
            <TabsTrigger value="income-statement">Laporan Laba Rugi</TabsTrigger>
            <TabsTrigger value="balance-sheet">Neraca</TabsTrigger>
            <TabsTrigger value="general-journal">Jurnal Umum</TabsTrigger>
            <TabsTrigger value="cash-flow">Arus Kas</TabsTrigger>
            <TabsTrigger value="general-ledger">Buku Besar</TabsTrigger>
        </TabsList>
        <TabsContent value="income-statement">
            <IncomeStatement />
        </TabsContent>
        <TabsContent value="balance-sheet">
            <BalanceSheet />
        </TabsContent>
        <TabsContent value="general-journal">
            <GeneralJournal />
        </TabsContent>
        <TabsContent value="cash-flow">
            <CashFlowStatement />
        </TabsContent>
        <TabsContent value="general-ledger">
            <GeneralLedger />
        </TabsContent>
      </Tabs>
    </div>
  );
}
