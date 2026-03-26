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
  const { transactions, inventory } = useAppState();

  const chartData = useMemo(() => {
    const revenueAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').map(a => a.name);
    const expenseAccountNames = CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').map(a => a.name);

    const dataByMonth: { [key: string]: { revenue: number; expenses: number } } = {};
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('id-ID', { month: 'short' });
    }).reverse();

    months.forEach(month => {
      dataByMonth[month] = { revenue: 0, expenses: 0 };
    });

    // Process all transactions
    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('id-ID', { month: 'short' });
      if (dataByMonth[month]) {
        // Accumulate cash-based revenues and expenses
        if (revenueAccountNames.includes(t.category)) {
          dataByMonth[month].revenue += t.amount;
        } else if (expenseAccountNames.includes(t.category)) {
          dataByMonth[month].expenses += t.amount;
        }

        // Calculate and add COGS for sales transactions
        const isSale = t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan');
        if (isSale && t.itemId && t.quantity) {
          const item = inventory.find(i => i.id === t.itemId);
          if (item) {
            const cogsAmount = item.costPerUnit * t.quantity;
            dataByMonth[month].expenses += cogsAmount;
          }
        }
      }
    });

    return Object.keys(dataByMonth).map(month => ({
      month,
      ...dataByMonth[month],
    }));
  }, [transactions, inventory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ikhtisar Pendapatan vs Beban</CardTitle>
        <CardDescription>Pendapatan dan beban selama 6 bulan terakhir.</CardDescription>
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
              dataKey="month"
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
