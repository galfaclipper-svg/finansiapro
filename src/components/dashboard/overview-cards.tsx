'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAppState } from '@/hooks/use-app-state';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

export function OverviewCards() {
  const { transactions, inventory, dateRange } = useAppState();

  const { totalRevenue, netIncome, cashBalance, totalTransactions } = useMemo(() => {
    
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

    const calculateMetrics = (transactionSet: typeof transactions) => {
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
            } else {
                if (accountType === 'Assets' && t.category !== cashAccountName) {
                    return [{ ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
                }
                return [{ ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
            }
        });

        const cogsEntries: any[] = [];
        transactionSet.forEach(t => {
            const isSale = t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan');
            if (isSale) {
                if (t.items && t.items.length > 0) {
                    t.items.forEach((itemEntry: any, i: number) => {
                        const item = inventory.find(inv => inv.id === itemEntry.itemId);
                        if (item) {
                            const cogsAmount = item.costPerUnit * itemEntry.quantity;
                            if (cogsAmount > 0) {
                                cogsEntries.push({ ...t, id: `${t.id}-cogs-debit-${i}`, entryType: 'Debit', accountName: 'Harga Pokok Penjualan', amount: cogsAmount });
                                cogsEntries.push({ ...t, id: `${t.id}-cogs-credit-${i}`, entryType: 'Credit', accountName: 'Persediaan Barang Dagang', amount: cogsAmount });
                            }
                        }
                    });
                } else if (t.itemId && t.quantity) {
                    const item = inventory.find(i => i.id === t.itemId);
                    if (item) {
                        const cogsAmount = item.costPerUnit * t.quantity;
                        if (cogsAmount > 0) {
                            cogsEntries.push({ ...t, id: `${t.id}-cogs-debit`, entryType: 'Debit', accountName: 'Harga Pokok Penjualan', amount: cogsAmount });
                            cogsEntries.push({ ...t, id: `${t.id}-cogs-credit`, entryType: 'Credit', accountName: 'Persediaan Barang Dagang', amount: cogsAmount });
                        }
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
            } else {
                accountBalances[entry.accountName] += (entry.entryType === 'Credit' ? amount : -amount);
            }
        });
        return accountBalances;
    };
    
    const periodBalances = calculateMetrics(periodTransactions);
    const finalBalances = calculateMetrics(allTransactionsToPeriodEnd);

    const totalRevenue = Object.entries(periodBalances).reduce((sum, [name, balance]) => {
        const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === name);
        return accountInfo?.type === 'Revenue' ? sum + balance : sum;
    }, 0);
    
    const totalExpenses = Object.entries(periodBalances).reduce((sum, [name, balance]) => {
        const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === name);
        return accountInfo?.type === 'Expenses' ? sum + balance : sum;
    }, 0);

    const netIncome = totalRevenue - totalExpenses;
    const cashBalance = finalBalances['Kas'] || 0;

    return { totalRevenue, netIncome, cashBalance, totalTransactions: periodTransactions.length };
  }, [transactions, inventory, dateRange]);


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">Pendapatan kotor di periode terpilih.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(netIncome)}</div>
           <p className="text-xs text-muted-foreground">Laba bersih di periode terpilih.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Kas Akhir</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(cashBalance)}</div>
          <p className="text-xs text-muted-foreground">Total kas pada akhir periode.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTransactions}</div>
          <p className="text-xs text-muted-foreground">Jumlah transaksi di periode terpilih.</p>
        </CardContent>
      </Card>
    </div>
  );
}
