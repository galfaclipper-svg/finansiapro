'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useAppState } from '@/hooks/use-app-state';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import { Wallet } from 'lucide-react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { eachDayOfInterval, format, startOfDay } from 'date-fns';
import type { Transaction } from '@/lib/types';

const chartConfig = {
  balance: {
    label: 'Kas',
    color: 'hsl(var(--primary))',
  },
};

export function CashPositionChart() {
  const { transactions, inventory, dateRange } = useAppState();

  const { chartData, finalBalance } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return { chartData: [], finalBalance: 0 };
    }
    
    // 1. Re-use the correct, robust balance calculation logic from reports/overview
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
    
    // 2. Calculate accurate starting cash balance
    const transactionsBeforePeriod = transactions.filter(t => new Date(t.date) < startOfDay(dateRange.from!));
    const startingBalances = calculateBalances(transactionsBeforePeriod, inventory);
    let runningBalance = startingBalances['Kas'] || 0;
    
    // 3. Group transactions within the period by day using correct cash change logic
    const transactionsInPeriod = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const toDate = new Date(dateRange.to as Date);
        toDate.setHours(23, 59, 59, 999);
        return transactionDate >= (dateRange.from as Date) && transactionDate <= toDate;
    });

    const dailyChanges: { [key: string]: number } = {};
    const nonCashCategories = ['Beban Penyusutan', 'Beban Amortisasi'];

    transactionsInPeriod.forEach(t => {
      // Exclude non-cash transactions from daily cash change calculation
      if (nonCashCategories.includes(t.category)) {
          return;
      }
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      dailyChanges[dateKey] = dailyChanges[dateKey] || 0;
      const cashChange = t.type === 'cash-in' ? t.amount : -t.amount;
      dailyChanges[dateKey] += cashChange;
    });

    // 4. Create the chart data with a running balance
    const chartData = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const change = dailyChanges[dateKey] || 0;
      runningBalance += change;
      return {
        date: format(day, 'd/M'),
        balance: runningBalance,
      };
    });
    
    // The final balance is the last calculated running balance
    const finalBalance = runningBalance;

    return { chartData, finalBalance };
  }, [transactions, inventory, dateRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-500" />
            Posisi Kas
        </CardTitle>
        <CardDescription>Saldo kas Anda dari waktu ke waktu.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold mb-4">{formatCurrency(finalBalance)}</div>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={chartData} accessibilityLayer margin={{ left: -20, right: 10 }}>
            <defs>
                <linearGradient id="fillCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.1}/>
                </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={80}
              tickFormatter={(tick) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(tick as number)}
              domain={['dataMin - 1000000', 'dataMax + 1000000']}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                indicator="dot"
                formatter={(value) => formatCurrency(value as number)}
              />}
            />
            <Area
              dataKey="balance"
              type="natural"
              fill="url(#fillCash)"
              strokeWidth={2}
              stroke="var(--color-balance)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
