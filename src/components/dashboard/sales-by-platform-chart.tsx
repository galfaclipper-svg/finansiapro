'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { useAppState } from '@/hooks/use-app-state';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, TrendingUp, PackageSearch } from 'lucide-react';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function SalesByPlatformChart() {
  const { transactions, inventory, dateRange } = useAppState();

  const platformStats = useMemo(() => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return [];
    }

    const platformData: Record<string, { revenue: number; products: Record<string, number> }> = {};

    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const toDate = new Date(dateRange.to as Date);
      toDate.setHours(23, 59, 59, 999);
      return transactionDate >= (dateRange.from as Date) && transactionDate <= toDate;
    });

    filteredTransactions.forEach(t => {
      if (t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan')) {
        const match = t.category.match(/Pendapatan Penjualan \((.+)\)/);
        const platform = match ? match[1] : 'Offline / Lainnya';

        if (!platformData[platform]) {
          platformData[platform] = { revenue: 0, products: {} };
        }

        platformData[platform].revenue += t.amount;

        const addProductQty = (itemId: string, qty: number) => {
          const invItem = inventory.find(i => i.id === itemId);
          const name = invItem ? invItem.name : 'Produk tidak diketahui';
          platformData[platform].products[name] = (platformData[platform].products[name] || 0) + qty;
        };

        if (t.items && t.items.length > 0) {
          t.items.forEach(item => addProductQty(item.itemId, item.quantity));
        } else if (t.itemId && t.quantity) {
          addProductQty(t.itemId, t.quantity);
        }
      }
    });

    return Object.entries(platformData)
      .map(([platform, data]) => ({
        platform,
        revenue: data.revenue,
        products: Object.entries(data.products)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty), // sort products by qty desc
      }))
      .sort((a, b) => b.revenue - a.revenue); // sort platforms by revenue desc
  }, [transactions, inventory, dateRange]);

  const totalRevenueAll = platformStats.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <Card className="glass-panel glass-panel-amber flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Penjualan per Platform
                </CardTitle>
                <CardDescription className="pt-1.5">
                    Analisis total pendapatan & barang laku tiap marketplace
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {platformStats.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-8 h-64 text-center border-2 border-dashed rounded-xl border-border">
               <PackageSearch className="w-12 h-12 text-muted-foreground mb-4" />
               <h3 className="text-lg font-medium text-foreground">Belum ada penjualan</h3>
               <p className="text-sm text-muted-foreground max-w-sm mt-1">Belum ada transaksi pendapatan penjualan dalam rentang waktu ini.</p>
           </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left side: Graph */}
                <div className="lg:col-span-3">
                    <ChartContainer config={{ revenue: { label: "Pendapatan", color: "hsl(var(--primary))" } }} className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={platformStats} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                            <XAxis 
                                dataKey="platform" 
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                                tickFormatter={(value) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(value)}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                                tick={{ fontSize: 12 }}
                            />
                            <ChartTooltip 
                                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                                content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} 
                            />
                            <Bar 
                                dataKey="revenue" 
                                radius={[6, 6, 0, 0]}
                                maxBarSize={60}
                            >
                                {platformStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Right side: Product Data */}
                <div className="lg:col-span-2 flex flex-col h-full bg-muted/20 rounded-xl p-4 border border-border">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        Rincian Unit Terjual
                    </h3>
                    <ScrollArea className="flex-1 pr-4 -mr-4 h-[260px]">
                        <div className="space-y-6">
                            {platformStats.map((platform, idx) => (
                                <div key={platform.platform} className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                <h4 className="font-semibold text-sm text-foreground">{platform.platform}</h4>
                                            </div>
                                            <div className="text-xs font-medium text-primary mt-1 ml-5">
                                                Total: {formatCurrency(platform.revenue)}
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full shadow-sm mt-0.5">
                                            {Math.round((platform.revenue / totalRevenueAll) * 100)}%
                                        </div>
                                    </div>
                                    
                                    <div className="pl-5 space-y-2.5">
                                        {platform.products.map(product => (
                                            <div key={product.name} className="flex justify-between items-center text-sm border-b border-dashed border-border/50 pb-1.5 last:border-0 last:pb-0">
                                                <span className="text-muted-foreground line-clamp-1 flex-1 pr-3" title={product.name}>
                                                    {product.name}
                                                </span>
                                                <Badge variant="secondary" className="font-semibold text-xs tabular-nums bg-muted shadow-sm shrink-0 text-foreground border-border">
                                                    {product.qty} <span className="font-normal text-muted-foreground ml-1">unit</span>
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
