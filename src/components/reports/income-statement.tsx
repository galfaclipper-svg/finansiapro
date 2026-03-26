
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface IncomeStatementData {
    revenues: { [key: string]: number };
    totalRevenue: number;
    expenses: { [key: string]: number };
    totalExpenses: number;
    netIncome: number;
}

export function IncomeStatement({ data }: { data: IncomeStatementData }) {
    const { revenues, totalRevenue, expenses, totalExpenses, netIncome } = data;

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
                        {Object.entries(revenues).length > 0 ? Object.entries(revenues).map(([category, amount]) => (
                            <TableRow key={category}>
                                <TableCell className="pl-8">{category}</TableCell>
                                <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                            </TableRow>
                        )) : (
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
                        {Object.entries(expenses).length > 0 ? Object.entries(expenses).map(([category, amount]) => (
                            <TableRow key={category}>
                                <TableCell className="pl-8">{category}</TableCell>
                                <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                            </TableRow>
                        )) : (
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
                            <TableCell className="text-right">{netIncome < 0 ? `(${formatCurrency(Math.abs(netIncome))})` : formatCurrency(netIncome)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
}
