'use client';

import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

export function BalanceSheet() {
    const { transactions, inventory } = useAppState();

    const { assets, liabilities, equity, totalAssets, totalLiabilitiesAndEquity } = useMemo(() => {
        // --- Assets ---
        const cashBalance = transactions.reduce((balance, t) => {
            return t.type === 'cash-in' ? balance + t.amount : balance - t.amount;
        }, 0);
        
        const inventoryValue = inventory.reduce((sum, item) => sum + item.stock * item.costPerUnit, 0);

        const assets = {
            'Kas': cashBalance,
            'Persediaan Barang Dagang': inventoryValue,
        };
        const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
        
        // --- Liabilities & Equity (Simplified) ---
        const revenueAccounts = CHART_OF_ACCOUNTS.filter(a => a.type === 'Revenue').map(a => a.name);
        const expenseAccounts = CHART_OF_ACCOUNTS.filter(a => a.type === 'Expenses').map(a => a.name);

        const totalRevenue = transactions
            .filter(t => t.type === 'cash-in' && revenueAccounts.includes(t.category))
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalExpenses = transactions
            .filter(t => t.type === 'cash-out' && expenseAccounts.includes(t.category))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const netIncome = totalRevenue - totalExpenses;

        const liabilities = {
            'Utang Usaha': 0, // Mocked for now
        };
        const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);

        // To make the sheet balance for this demo, Owner's Capital is a calculated plug.
        const ownersCapital = totalAssets - totalLiabilities - netIncome;

        const equity = {
            'Modal Pemilik': ownersCapital,
            'Laba Ditahan': netIncome,
        };
        const totalEquity = Object.values(equity).reduce((sum, val) => sum + val, 0);

        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        // A check to ensure accounting equation holds. Due to floating point math, use a small tolerance.
        if (Math.abs(totalAssets - totalLiabilitiesAndEquity) > 0.01) {
            console.warn("Neraca tidak seimbang!", { totalAssets, totalLiabilitiesAndEquity });
        }


        return { assets, liabilities, equity, totalAssets, totalLiabilitiesAndEquity };

    }, [transactions, inventory]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Neraca</CardTitle>
                <CardDescription>Potret posisi keuangan perusahaan pada titik waktu tertentu.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-2 p-4">Aset</h3>
                        <Table>
                            <TableBody>
                                {Object.entries(assets).map(([name, amount]) => (
                                    <TableRow key={name}>
                                        <TableCell>{name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold text-base">
                                    <TableCell>Total Aset</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalAssets)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-lg mb-2 p-4">Kewajiban</h3>
                             <Table>
                                <TableBody>
                                    {Object.entries(liabilities).map(([name, amount]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div>
                             <h3 className="font-bold text-lg mb-2 p-4">Ekuitas</h3>
                            <Table>
                                <TableBody>
                                    {Object.entries(equity).map(([name, amount]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         <Table>
                            <TableFooter>
                                <TableRow className="font-bold text-base">
                                    <TableCell>Total Kewajiban dan Ekuitas</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalLiabilitiesAndEquity)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
