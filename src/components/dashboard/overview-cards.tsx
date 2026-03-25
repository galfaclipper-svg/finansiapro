'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ReceiptText, Users, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAppState } from '@/hooks/use-app-state';

export function OverviewCards() {
  const { transactions } = useAppState();

  const totalRevenue = transactions
    .filter(t => t.type === 'cash-in' && t.category === 'Sales Revenue')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'cash-out')
    .reduce((acc, t) => acc + t.amount, 0);

  const netIncome = totalRevenue - totalExpenses;
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
          <p className="text-xs text-muted-foreground">+20.1% dari bulan lalu</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(netIncome)}</div>
          <p className="text-xs text-muted-foreground">+180.1% dari bulan lalu</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">+19% dari bulan lalu</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{totalTransactions}</div>
          <p className="text-xs text-muted-foreground">+5 sejak jam terakhir</p>
        </CardContent>
      </Card>
    </div>
  );
}
