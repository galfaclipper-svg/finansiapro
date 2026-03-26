'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useAppState } from '@/hooks/use-app-state';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { eachDayOfInterval, eachMonthOfInterval, format, differenceInDays, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';


const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--primary))',
  },
  expenses: {
    label: 'Beban',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

export function RevenueChart() {
  const { transactions, inventory, dateRange } = useAppState();

  const chartData = useMemo(() => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
        return [];
    }

    const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const toDate = new Date(dateRange.to as Date);
        toDate.setHours(23, 59, 59, 999);
        return transactionDate >= (dateRange.from as Date) && transactionDate <= toDate;
    });
    
    const revenueAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').map(a => a.name);
    const expenseAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').map(a => a.name);
    
    const days = differenceInDays(dateRange.to, dateRange.from);

    // Group by day if the range is 90 days or less, otherwise group by month
    const useDailyGrouping = days <= 90;
    
    let dataByDate: { [key: string]: { revenue: number; expenses: number } } = {};
    let labels: string[] = [];

    if (useDailyGrouping) {
      labels = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(d => format(d, 'd/M'));
      labels.forEach(label => { dataByDate[label] = { revenue: 0, expenses: 0 }; });
    } else {
      labels = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to }).map(d => format(d, 'MMM y', {locale: id}));
      labels.forEach(label => { dataByDate[label] = { revenue: 0, expenses: 0 }; });
    }
    
    // Process all transactions
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const key = useDailyGrouping ? format(date, 'd/M') : format(date, 'MMM y', {locale: id});

      if (dataByDate[key]) {
        if (revenueAccountNames.includes(t.category)) {
          dataByDate[key].revenue += t.amount;
        } else if (expenseAccountNames.includes(t.category)) {
          dataByDate[key].expenses += t.amount;
        }

        const isSale = t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan');
        if (isSale && t.itemId && t.quantity) {
          const item = inventory.find(i => i.id === t.itemId);
          if (item) {
            const cogsAmount = item.costPerUnit * t.quantity;
            dataByDate[key].expenses += cogsAmount;
          }
        }
      }
    });

    return labels.map(label => ({
      date: label,
      ...dataByDate[label],
    }));
  }, [transactions, inventory, dateRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ikhtisar Pendapatan vs Beban</CardTitle>
        <CardDescription>Pendapatan dan beban selama periode yang dipilih.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <AreaChart data={chartData} accessibilityLayer margin={{ left: -20, right: 10 }}>
            <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1}/>
                </linearGradient>
                 <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.1}/>
                </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
             <YAxis
              tickFormatter={(tick) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(tick as number)}
              axisLine={false}
              tickLine={false}
              width={80}
             />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value) => formatCurrency(value as number)}
              />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" strokeWidth={2} stroke="var(--color-revenue)" stackId="a" />
            <Area dataKey="expenses" type="natural" fill="url(#fillExpenses)" strokeWidth={2} stroke="var(--color-expenses)" stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
