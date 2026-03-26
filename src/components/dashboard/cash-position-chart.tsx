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

const chartConfig = {
  balance: {
    label: 'Kas',
    color: 'hsl(var(--primary))',
  },
};

export function CashPositionChart() {
  const { transactions, inventory } = useAppState();

  const { chartData, finalBalance } = useMemo(() => {
    
    // --- 1. Universal Journal Entry Generation ---
    let baseJournalEntries = transactions.flatMap(t => {
      const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
      const accountType = account?.type;
      const cashAccountName = "Kas";

      if (t.category === 'Beban Penyusutan' || t.category === 'Beban Amortisasi') {
         return []; // These are non-cash
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

    const allJournalEntries = [...baseJournalEntries, ...cogsEntries].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- 3. Calculate running cash balance ---
    const dataByDay: { [key: string]: { date: string; balance: number } } = {};
    let runningBalance = 0;

    allJournalEntries.forEach(entry => {
        if(entry.accountName === 'Kas') {
            if (entry.entryType === 'Debit') {
                runningBalance += entry.amount;
            } else { // Credit
                runningBalance -= entry.amount;
            }
        }
        const dateStr = new Date(entry.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        dataByDay[dateStr] = { date: dateStr, balance: runningBalance };
    });

    const chartData = Object.values(dataByDay);
    const finalBalance = runningBalance;

    return { chartData, finalBalance };
  }, [transactions, inventory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-500" />
            Posisi Kas
        </CardTitle>
        <CardDescription>Total saldo kas Anda yang tersedia saat ini.</CardDescription>
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
