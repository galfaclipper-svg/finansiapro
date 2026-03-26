
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
     // Income Statement Data
    const revenueAccounts = CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').map(a => a.name);
    const expenseAccounts = CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').map(a => a.name);
    const revenues: { [key: string]: number } = {};
    const expenses: { [key: string]: number } = {};
    transactions.forEach(t => {
      if (t.type === 'cash-in' && revenueAccounts.includes(t.category)) {
        revenues[t.category] = (revenues[t.category] || 0) + t.amount;
      } else if (t.type === 'cash-out' && expenseAccounts.includes(t.category)) {
        expenses[t.category] = (expenses[t.category] || 0) + t.amount;
      }
    });
    const totalRevenue = Object.values(revenues).reduce((sum, amount) => sum + amount, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    // Balance Sheet Data
    const cashBalance = transactions.reduce((balance, t) => t.type === 'cash-in' ? balance + t.amount : balance - t.amount, 0);
    const inventoryValue = inventory.reduce((sum, item) => sum + item.stock * item.costPerUnit, 0);
    const assets = { 'Kas': cashBalance, 'Persediaan Barang Dagang': inventoryValue };
    const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const liabilities = {};
    const totalLiabilities = 0;
    const ownersCapital = transactions.filter(t => t.category === 'Modal Pemilik').reduce((sum, t) => sum + t.amount, 0);
    const ownerDrawings = transactions.filter(t => t.category === 'Prive').reduce((sum, t) => sum + t.amount, 0);
    const retainedEarningsBeginning = 0;
    let equity = {
      'Modal Pemilik': ownersCapital,
      'Laba Ditahan': retainedEarningsBeginning - ownerDrawings,
      'Laba Bersih (Periode Berjalan)': netIncome,
    };
    let totalEquity = Object.values(equity).reduce((sum, val) => sum + val, 0);
    let totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const balanceDifference = totalAssets - totalLiabilitiesAndEquity;
    if (Math.abs(balanceDifference) > 0.01) {
        equity['Modal Pemilik'] += balanceDifference;
        totalLiabilitiesAndEquity = totalAssets;
    }
    
    // General Journal Data
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

    // Cash Flow Data
    const cashFromSales = transactions.filter(t => t.type === 'cash-in' && revenueAccounts.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
    const cashForInventory = transactions.filter(t => t.type === 'cash-out' && t.category === 'Persediaan Barang Dagang').reduce((sum, t) => sum + t.amount, 0);
    const cashForExpenses = transactions.filter(t => t.type === 'cash-out' && expenseAccounts.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
    const operatingFlows: { name: string, amount: number }[] = [];
    if (cashFromSales > 0) operatingFlows.push({ name: 'Penerimaan dari Pelanggan', amount: cashFromSales });
    if (cashForInventory > 0) operatingFlows.push({ name: 'Pembayaran kepada Pemasok', amount: -cashForInventory });
    if (cashForExpenses > 0) operatingFlows.push({ name: 'Pembayaran Beban Operasional', amount: -cashForExpenses });
    const totalOperating = operatingFlows.reduce((sum, flow) => sum + flow.amount, 0);
    const endingCash = cashBalance;

    // General Ledger Data
    const allJournalEntriesForLedger = transactions.flatMap(t => {
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
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

    // 1. Income Statement Sheet
    const incomeData = [
      [{v: companyName, s:{font:{bold:true, sz:16}}}],
      [{v: "Laporan Laba Rugi", s:{font:{bold:true, sz:14}}}],
      [{v: `Per ${today}`, s:{font:{italic:true}}}],
      [], // Spacer
      ["Pendapatan"],
      ...Object.entries(reportData.incomeStatement.revenues).map(([cat, amt]) => [`  ${cat}`, formatCurrency(amt)]),
      [{v:"Total Pendapatan", s:{font:{bold:true}}}, {v: formatCurrency(reportData.incomeStatement.totalRevenue), s:{font:{bold:true}}}],
      [],
      ["Beban"],
      ...Object.entries(reportData.incomeStatement.expenses).map(([cat, amt]) => [`  ${cat}`, formatCurrency(amt)]),
      [{v: "Total Beban", s:{font:{bold:true}}}, {v: formatCurrency(reportData.incomeStatement.totalExpenses), s:{font:{bold:true}}}],
      [],
      [{v: "Laba Bersih", s:{font:{bold:true, sz: 12}}}, {v: formatCurrency(reportData.incomeStatement.netIncome), s:{font:{bold:true, sz: 12}}}],
    ];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    wsIncome['!cols'] = [{wch: 40}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, wsIncome, "Laba Rugi");

    // 2. Balance Sheet
    const balanceSheetData = [
      [{v: companyName, s:{font:{bold:true, sz:16}}}],
      [{v: "Neraca", s:{font:{bold:true, sz:14}}}],
      [{v: `Per ${today}`, s:{font:{italic:true}}}],
      [],
      ["Aset"],
      ...Object.entries(reportData.balanceSheet.assets).map(([name, amount]) => [`  ${name}`, formatCurrency(amount)]),
      [{v: "Total Aset", s:{font:{bold:true}}}, {v:formatCurrency(reportData.balanceSheet.totalAssets), s:{font:{bold:true}}}],
      [],
      ["Kewajiban & Ekuitas"],
      ...Object.entries(reportData.balanceSheet.liabilities).map(([name, amount]) => [`  ${name}`, formatCurrency(amount)]),
      ...Object.entries(reportData.balanceSheet.equity).map(([name, amount]) => [`  ${name}`, formatCurrency(amount)]),
      [{v: "Total Kewajiban & Ekuitas", s:{font:{bold:true}}}, {v: formatCurrency(reportData.balanceSheet.totalLiabilitiesAndEquity), s:{font:{bold:true}}}]
    ];
    const wsBalance = XLSX.utils.aoa_to_sheet(balanceSheetData);
    wsBalance['!cols'] = [{wch: 40}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, wsBalance, "Neraca");

    // 3. General Journal
    const journalExportData: any[] = [["Tanggal", "Akun", "Keterangan", "Debit", "Kredit"]];
    const groupedEntries = reportData.generalJournal.journalEntries.reduce((acc, entry) => {
        (acc[entry.id] = acc[entry.id] || []).push(entry);
        return acc;
    }, {} as Record<string, any[]>);
    Object.values(groupedEntries).forEach(entries => {
      journalExportData.push([
        format(new Date(entries[0].date), 'd MMM y', { locale: id }),
        entries[0].entryType === 'Debit' ? entries[0].accountName : `  ${entries[0].accountName}`,
        '',
        entries[0].entryType === 'Debit' ? entries[0].amount : '',
        entries[0].entryType === 'Credit' ? entries[0].amount : ''
      ]);
      journalExportData.push([
        '',
        entries[1].entryType === 'Debit' ? entries[1].accountName : `  ${entries[1].accountName}`,
        '',
        entries[1].entryType === 'Debit' ? entries[1].amount : '',
        entries[1].entryType === 'Credit' ? entries[1].amount : ''
      ]);
       journalExportData.push(['', `  (${entries[0].description})`, '', '', '']);
       journalExportData.push([]); // Spacer row
    });
    const wsJournal = XLSX.utils.aoa_to_sheet(journalExportData);
    wsJournal['!cols'] = [{wch: 15}, {wch: 30}, {wch: 30}, {wch: 15}, {wch: 15}];
    XLSX.utils.book_append_sheet(wb, wsJournal, "Jurnal Umum");

    XLSX.writeFile(wb, "Laporan Keuangan FinansiaPro.xlsx");
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

      // Footer
      doc.setFontSize(8);
      doc.text(`Halaman ${pageNumber} dari ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
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
    pageNumber++;
    doc.addPage();
    addHeaderFooter(doc, 'Neraca');
    autoTable(doc, {
        startY: 40,
        head: [['Aset', 'Jumlah']],
        body: [
            ...Object.entries(reportData.balanceSheet.assets).map(([name, amount]) => [name, {content: formatCurrency(amount), styles: {halign: 'right'}}]),
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
            ...Object.entries(reportData.balanceSheet.liabilities).map(([name, amount]) => [name, {content: formatCurrency(amount), styles: {halign: 'right'}}]),
            ...Object.entries(reportData.balanceSheet.equity).map(([name, amount]) => [name, {content: formatCurrency(amount), styles: {halign: 'right'}}]),
        ],
        foot: [['Total Kewajiban dan Ekuitas', {content: formatCurrency(reportData.balanceSheet.totalLiabilitiesAndEquity), styles: {halign: 'right'}}]],
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
        footStyles: { fontStyle: 'bold', fillColor: '#f9f9f9', textColor: 0 },
    });

    // --- Page 3: General Journal ---
    pageNumber++;
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
                if (data.row.section === 'body') {
                    // This is a merged cell, draw a line above it
                    doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
                }
             }
         }
    });

     // --- Page 4: Cash Flow ---
    pageNumber++;
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
        pageNumber++;
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
    for(let i = 1; i <= doc.getNumberOfPages(); i++) {
      doc.setPage(i);
      // This is a bit of a hack to update the total pages
      const newTotalPages = doc.getNumberOfPages();
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
