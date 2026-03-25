'use client';

import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

// Helper function to create a report section
const ReportSection = ({ title, items, total }: { title: string; items: { name: string, amount: number }[]; total: number }) => {
    if (items.length === 0) return null;

    return (
        <>
            <TableRow className="font-bold">
                <TableCell>{title}</TableCell>
                <TableCell></TableCell>
            </TableRow>
            {items.map(({name, amount}) => (
                <TableRow key={name}>
                    <TableCell className="pl-8">{name}</TableCell>
                    <TableCell className="text-right">{amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}</TableCell>
                </TableRow>
            ))}
            <TableRow className="font-medium bg-secondary/50">
                <TableCell className="pl-4">{`Total Arus Kas dari ${title}`}</TableCell>
                <TableCell className="text-right">{total < 0 ? `(${formatCurrency(Math.abs(total))})` : formatCurrency(total)}</TableCell>
            </TableRow>
        </>
    );
};


export function CashFlowStatement() {
    const { transactions } = useAppState();

    const {
        operatingFlows,
        totalOperating,
        investingFlows,
        totalInvesting,
        financingFlows,
        totalFinancing,
        netCashFlow,
        beginningCash,
        endingCash
    } = useMemo(() => {
        let operatingFlows: { name: string, amount: number }[] = [];
        let investingFlows: { name: string, amount: number }[] = [];
        let financingFlows: { name: string, amount: number }[] = [];
        
        // Cash received from customers
        const cashFromSales = transactions
            .filter(t => t.type === 'cash-in' && CHART_OF_ACCOUNTS.find(a => a.name === t.category)?.type === 'Revenue')
            .reduce((sum, t) => sum + t.amount, 0);
        if (cashFromSales > 0) operatingFlows.push({ name: 'Penerimaan dari Pelanggan', amount: cashFromSales });

        // Cash paid for inventory
        const cashForInventory = transactions
            .filter(t => t.type === 'cash-out' && t.category === 'Persediaan Barang Dagang')
            .reduce((sum, t) => sum + t.amount, 0);
        if (cashForInventory > 0) operatingFlows.push({ name: 'Pembayaran kepada Pemasok', amount: -cashForInventory });
        
        // Cash paid for operating expenses
        const cashForExpenses = transactions
            .filter(t => t.type === 'cash-out' && CHART_OF_ACCOUNTS.find(a => a.name === t.category)?.type === 'Expenses')
            .reduce((sum, t) => sum + t.amount, 0);
        if (cashForExpenses > 0) operatingFlows.push({ name: 'Pembayaran Beban Operasional', amount: -cashForExpenses });

        // Other cash flows can be added here, e.g. for investing and financing
        // For simplicity, this demo only includes operating activities.
        
        const totalOperating = operatingFlows.reduce((sum, flow) => sum + flow.amount, 0);
        const totalInvesting = 0;
        const totalFinancing = 0;

        const netCashFlow = totalOperating + totalInvesting + totalFinancing;

        // For this demo, beginning cash is 0 as we don't have prior period data
        const beginningCash = 0;
        const endingCash = transactions.reduce((balance, t) => {
            return t.type === 'cash-in' ? balance + t.amount : balance - t.amount;
        }, 0);

        return { operatingFlows, totalOperating, investingFlows, totalInvesting, financingFlows, totalFinancing, netCashFlow, beginningCash, endingCash };

    }, [transactions]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Laporan Arus Kas</CardTitle>
                <CardDescription>Ringkasan arus kas masuk dan keluar dari aktivitas operasi, investasi, dan pendanaan.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Deskripsi</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <ReportSection title="Aktivitas Operasi" items={operatingFlows} total={totalOperating} />
                        <ReportSection title="Aktivitas Investasi" items={investingFlows} total={totalInvesting} />
                        <ReportSection title="Aktivitas Pendanaan" items={financingFlows} total={totalFinancing} />

                        <TableRow className="font-bold">
                            <TableCell>Kenaikan (Penurunan) Bersih Kas</TableCell>
                            <TableCell className="text-right">{netCashFlow < 0 ? `(${formatCurrency(Math.abs(netCashFlow))})` : formatCurrency(netCashFlow)}</TableCell>
                        </TableRow>
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell>Saldo Kas Awal Periode</TableCell>
                            <TableCell className="text-right">{formatCurrency(beginningCash)}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold text-lg">
                            <TableCell>Saldo Kas Akhir Periode</TableCell>
                            <TableCell className="text-right">{formatCurrency(endingCash)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
}
