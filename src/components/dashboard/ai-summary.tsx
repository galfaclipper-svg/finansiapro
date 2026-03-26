'use client';

import { useState, useMemo } from 'react';
import { financialReportInsights } from '@/ai/flows/financial-report-insights-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/hooks/use-app-state';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

export function AiSummary() {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { transactions, inventory, dateRange } = useAppState();

  const reportData = useMemo(() => {
    const periodTransactions = transactions.filter(t => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const transactionDate = new Date(t.date);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      return transactionDate >= dateRange.from && transactionDate <= toDate;
    });

    const allTransactionsToPeriodEnd = transactions.filter(t => {
        if (!dateRange?.to) return true;
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        return new Date(t.date) <= toDate;
    });
    
    // This is the full, accurate calculation logic replicated from the main reports page
    // to ensure the AI gets high-quality data.
    
    const calculateBalances = (transactionSet: typeof transactions, currentInventory: typeof inventory) => {
        let baseJournalEntries = transactionSet.flatMap(t => {
            const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
            const accountType = account?.type;
            const cashAccountName = "Kas";

            if (t.category === 'Beban Penyusutan') {
                return [{ ...t, entryType: 'Debit', accountName: 'Beban Penyusutan', amount: t.amount }, { ...t, entryType: 'Credit', accountName: 'Akumulasi Penyusutan - Peralatan', amount: t.amount }];
            }
            if (t.category === 'Beban Amortisasi') {
                return [{ ...t, entryType: 'Debit', accountName: 'Beban Amortisasi', amount: t.amount }, { ...t, entryType: 'Credit', accountName: 'Akumulasi Amortisasi', amount: t.amount }];
            }
            if (t.type === 'cash-in') {
                return [{ ...t, entryType: 'Debit', accountName: cashAccountName, amount: t.amount }, { ...t, entryType: 'Credit', accountName: t.category, amount: t.amount }];
            } else { // cash-out
                if (accountType === 'Assets' && t.category !== cashAccountName) {
                    return [{ ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
                }
                return [{ ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
            }
        });

        const cogsEntries: any[] = [];
        transactionSet.forEach(t => {
            const isSale = t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan');
            if (isSale && t.itemId && t.quantity) {
                const item = currentInventory.find(i => i.id === t.itemId);
                if (item) {
                    const cogsAmount = item.costPerUnit * t.quantity;
                    if (cogsAmount > 0) {
                        cogsEntries.push({ ...t, id: `${t.id}-cogs-debit`, entryType: 'Debit', accountName: 'Harga Pokok Penjualan', amount: cogsAmount });
                        cogsEntries.push({ ...t, id: `${t.id}-cogs-credit`, entryType: 'Credit', accountName: 'Persediaan Barang Dagang', amount: cogsAmount });
                    }
                }
            }
        });

        const allJournalEntries = [...baseJournalEntries, ...cogsEntries];
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
        return accountBalances;
    };
    
    const periodBalances = calculateBalances(periodTransactions, inventory);
    const finalBalances = calculateBalances(allTransactionsToPeriodEnd, inventory);

    const totalRevenue = Object.entries(periodBalances).reduce((sum, [name, bal]) => CHART_OF_ACCOUNTS.find(a=>a.name===name)?.type === 'Revenue' ? sum + bal : sum, 0);
    const totalExpenses = Object.entries(periodBalances).reduce((sum, [name, bal]) => CHART_OF_ACCOUNTS.find(a=>a.name===name)?.type === 'Expenses' ? sum + bal : sum, 0);
    const netIncome = totalRevenue - totalExpenses;

    const assets: { [key: string]: number } = {};
    const liabilities: { [key: string]: number } = {};
    Object.entries(finalBalances).forEach(([accountName, balance]) => {
      const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
      if (accountInfo?.type === 'Assets') assets[accountName] = balance;
      if (accountInfo?.type === 'Liabilities') liabilities[accountName] = balance;
    });

    const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
    const totalEquity = (finalBalances['Modal Pemilik'] || 0) + (finalBalances['Laba Ditahan'] || 0) + netIncome - (finalBalances['Prive'] || 0);

    return {
      incomeStatement: { totalRevenue, totalExpenses, netIncome },
      balanceSheet: { totalAssets, totalLiabilities, totalEquity },
    };
  }, [transactions, inventory, dateRange]);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setSummary('');

    // Create detailed, accurate reports for the AI flow
    const incomeStatement = `Laporan Laba Rugi (Periode Terpilih):\n- Total Pendapatan: ${formatCurrency(reportData.incomeStatement.totalRevenue)}\n- Total Beban: ${formatCurrency(reportData.incomeStatement.totalExpenses)}\n- Laba Bersih: ${formatCurrency(reportData.incomeStatement.netIncome)}`;
    const balanceSheet = `Neraca (Posisi Akhir Periode):\n- Total Aset: ${formatCurrency(reportData.balanceSheet.totalAssets)}\n- Total Kewajiban: ${formatCurrency(reportData.balanceSheet.totalLiabilities)}\n- Total Ekuitas: ${formatCurrency(reportData.balanceSheet.totalEquity)}`;

    try {
      const result = await financialReportInsights({
        incomeStatement,
        balanceSheet,
      });
      setSummary(result.summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal menghasilkan ringkasan AI.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Wawasan Berbasis AI
        </CardTitle>
        <CardDescription>
          Dapatkan ringkasan cepat kesehatan keuangan Anda untuk periode yang dipilih.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summary && !isLoading && (
          <div className="prose prose-sm max-w-none text-foreground/80 whitespace-pre-wrap">
            <p>{summary}</p>
          </div>
        )}
        {!summary && !isLoading && (
            <div className="text-center text-sm text-muted-foreground p-8">
                <p>Klik tombol untuk menghasilkan ringkasan keuangan Anda.</p>
            </div>
        )}
         {isLoading && (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )}

        <Button
          onClick={handleGenerateSummary}
          disabled={isLoading || !dateRange?.from || !dateRange?.to}
          className="mt-4 w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menghasilkan...
            </>
          ) : (
            'Hasilkan Ringkasan'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
