'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAppState } from '@/hooks/use-app-state';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

export function OverviewCards() {
  const { transactions, inventory } = useAppState();

  const { totalRevenue, netIncome, cashBalance } = useMemo(() => {
    // --- 1. Universal Journal Entry Generation ---
    let baseJournalEntries = transactions.flatMap(t => {
      const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
      const accountType = account?.type;
      const cashAccountName = "Kas";

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
        const item = inventory.find(i => i.id === t.itemId);
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
    
    // --- 4. Derive report numbers ---
    const revenues: { [key: string]: number } = {};
    const expenses: { [key: string]: number } = {};
    Object.entries(accountBalances).forEach(([accountName, balance]) => {
      const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
      if (accountInfo?.type === 'Revenue' && balance !== 0) revenues[accountName] = balance;
      if (accountInfo?.type === 'Expenses' && balance !== 0) expenses[accountName] = balance;
    });
    const totalRevenue = Object.values(revenues).reduce((sum, amount) => sum + amount, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
    const netIncome = totalRevenue - totalExpenses;
    const cashBalance = accountBalances['Kas'] || 0;

    return { totalRevenue, totalExpenses, netIncome, cashBalance };
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
          <CardTitle className="text-sm font-medium">Saldo Kas</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(cashBalance)}</div>
          <p className="text-xs text-muted-foreground">Total kas yang tersedia.</p>
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
