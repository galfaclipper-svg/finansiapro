'use client';

import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { useMemo } from 'react';

export function IncomeStatement() {
    const { transactions } = useAppState();

    const { revenues, totalRevenue, expenses, totalExpenses, netIncome } = useMemo(() => {
        const revenueAccounts = CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').map(a => a.name);
        const expenseAccounts = CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').map(a => a.name);

        const revenues: { [key: string]: number } = {};
        const expenses: { [key: string]: number } = {};

        transactions.forEach(t => {
            if (t.type === 'cash-in' && revenueAccounts.includes(t.category)) {
                revenues[t.category] = (revenues[t.category] || 0) + t.amount;
            } else if (t.type === 'cash-out' && expenseAccounts.includes(t.category)) {
                expenses[t.category] = (expenses[t.category] || 0) + t.amount;
            }
        });
        
        const totalRevenue = Object.values(revenues).reduce((sum, amount) => sum + amount, 0);
        const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
        const netIncome = totalRevenue - totalExpenses;

        return { revenues, totalRevenue, expenses, totalExpenses, netIncome };

    }, [transactions]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Laporan Laba Rugi</CardTitle>
                <CardDescription>Ringkasan pendapatan, beban, dan laba selama periode berjalan.</CardDescription>
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
                        <TableRow className="font-bold">
                            <TableCell>Pendapatan</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        {Object.entries(revenues).map(([category, amount]) => (
                            <TableRow key={category}>
                                <TableCell className="pl-8">{category}</TableCell>
                                <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                            </TableRow>
                        ))}
                         {Object.keys(revenues).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">Tidak ada pendapatan.</TableCell>
                            </TableRow>
                        )}
                        <TableRow className="font-medium bg-secondary/50">
                            <TableCell>Total Pendapatan</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                        </TableRow>

                        <TableRow className="font-bold mt-4">
                            <TableCell>Beban</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        {Object.entries(expenses).map(([category, amount]) => (
                            <TableRow key={category}>
                                <TableCell className="pl-8">{category}</TableCell>
                                <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                            </TableRow>
                        ))}
                        {Object.keys(expenses).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">Tidak ada beban.</TableCell>
                            </TableRow>
                        )}
                        <TableRow className="font-medium bg-secondary/50">
                            <TableCell>Total Beban</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                        </TableRow>
                    </TableBody>
                    <TableFooter>
                         <TableRow className="font-bold text-lg bg-card">
                            <TableCell>Laba Bersih</TableCell>
                            <TableCell className="text-right">{formatCurrency(netIncome)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
}
