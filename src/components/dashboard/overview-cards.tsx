'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ReceiptText, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAppState } from '@/hooks/use-app-state';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

export function OverviewCards() {
  const { transactions, inventory } = useAppState();

  const { totalRevenue, totalExpenses, netIncome } = useMemo(() => {
    const revenueAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').map(a => a.name);
    const expenseAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').map(a => a.name);

    const revenueFromTransactions = transactions
      .filter(t => revenueAccountNames.includes(t.category))
      .reduce((acc, t) => acc + t.amount, 0);

    const expensesFromTransactions = transactions
      .filter(t => expenseAccountNames.includes(t.category))
      .reduce((acc, t) => acc + t.amount, 0);
      
    const cogs = transactions
        .filter(t => t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan') && t.itemId && t.quantity)
        .reduce((acc, t) => {
            const item = inventory.find(i => i.id === t.itemId);
            return acc + (item ? item.costPerUnit * (t.quantity || 0) : 0);
        }, 0);

    const totalRevenue = revenueFromTransactions;
    const totalExpenses = expensesFromTransactions + cogs;
    const netIncome = totalRevenue - totalExpenses;

    return { totalRevenue, totalExpenses, netIncome };
  }, [transactions, inventory]);

  const totalTransactions = transactions.length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">Pendapatan kotor dari semua penjualan.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(netIncome)}</div>
           <p className="text-xs text-muted-foreground">Pendapatan setelah dikurangi semua beban.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Beban</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
           <p className="text-xs text-muted-foreground">Semua beban operasional dan HPP.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTransactions}</div>
          <p className="text-xs text-muted-foreground">Jumlah total transaksi yang tercatat.</p>
        </CardContent>
      </Card>
    </div>
  );
}
