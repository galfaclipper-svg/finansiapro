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

const chartConfig = {
  balance: {
    label: 'Kas',
    color: 'hsl(var(--primary))',
  },
};

export function CashPositionChart() {
  const { transactions, dateRange } = useAppState();

  const { chartData, finalBalance } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return { chartData: [], finalBalance: 0 };
    }
    
    // 1. Calculate the starting cash balance before the selected period begins
    const transactionsBeforePeriod = transactions.filter(t => new Date(t.date) < startOfDay(dateRange.from!));
    let startingBalance = 0;
    
    transactionsBeforePeriod.forEach(t => {
      if (t.category === 'Kas') {
         if (t.type === 'cash-in') { startingBalance += t.amount; }
         else { startingBalance -= t.amount; }
      } else {
        const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
        if (account?.type === 'Assets' && t.type === 'cash-out' && t.category !== 'Kas') { /* No cash change */ }
        else if (t.type === 'cash-out') { startingBalance -= t.amount; }
        else if (t.type === 'cash-in') { startingBalance += t.amount; }
      }
    });

    // 2. Group transactions within the period by day
    const transactionsInPeriod = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const toDate = new Date(dateRange.to as Date);
        toDate.setHours(23, 59, 59, 999);
        return transactionDate >= (dateRange.from as Date) && transactionDate <= toDate;
    });

    const dailyChanges: { [key: string]: number } = {};
    transactionsInPeriod.forEach(t => {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      dailyChanges[dateKey] = dailyChanges[dateKey] || 0;
      let cashChange = 0;
      if (t.category === 'Kas') {
         if (t.type === 'cash-in') { cashChange = t.amount; }
         else { cashChange = -t.amount; }
      } else {
        const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
        if (account?.type === 'Assets' && t.type === 'cash-out' && t.category !== 'Kas') { /* No cash change */ }
        else if (t.type === 'cash-out') { cashChange = -t.amount; }
        else if (t.type === 'cash-in') { cashChange = t.amount; }
      }
      dailyChanges[dateKey] += cashChange;
    });

    // 3. Create the chart data with a running balance
    const chartData = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const change = dailyChanges[dateKey] || 0;
      if (index === 0) {
        startingBalance += change;
      } else {
        startingBalance += change;
      }
      return {
        date: format(day, 'd/M'),
        balance: startingBalance,
      };
    });
    
    const finalBalance = startingBalance;

    return { chartData, finalBalance };
  }, [transactions, dateRange]);

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
