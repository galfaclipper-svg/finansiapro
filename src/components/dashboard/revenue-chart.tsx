'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useAppState } from '@/hooks/use-app-state';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--primary))',
  },
  expenses: {
    label: 'Pengeluaran',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

export function RevenueChart() {
  const { transactions } = useAppState();

  const chartData = useMemo(() => {
    const dataByMonth: { [key: string]: { revenue: number; expenses: number } } = {};
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('id-ID', { month: 'short' });
    }).reverse();

    months.forEach(month => {
      dataByMonth[month] = { revenue: 0, expenses: 0 };
    });

    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('id-ID', { month: 'short' });
      if (dataByMonth[month]) {
        if (t.type === 'cash-in' && t.category === 'Sales Revenue') {
          dataByMonth[month].revenue += t.amount;
        } else if (t.type === 'cash-out') {
          dataByMonth[month].expenses += t.amount;
        }
      }
    });

    return Object.keys(dataByMonth).map(month => ({
      month,
      ...dataByMonth[month],
    }));
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ikhtisar</CardTitle>
        <CardDescription>Pendapatan dan pengeluaran selama 6 bulan terakhir.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <BarChart data={chartData} accessibilityLayer>
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
             />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value) => formatCurrency(value as number)}
              />}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
