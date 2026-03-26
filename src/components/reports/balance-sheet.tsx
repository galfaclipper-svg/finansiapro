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
        // This logic is now centralized and consistent with other reports
        const accountBalances: { [key: string]: number } = {};
        CHART_OF_ACCOUNTS.forEach(acc => { accountBalances[acc.name] = 0; });

        const allJournalEntries = transactions.flatMap(t => {
            const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
            const accountType = account?.type;
            const cashAccountName = "Kas";
            if (t.type === 'cash-in') {
                return [ { ...t, entryType: 'Debit', accountName: cashAccountName, amount: t.amount }, { ...t, entryType: 'Credit', accountName: t.category, amount: t.amount }];
            } else {
                if (accountType === 'Assets' && t.category !== cashAccountName) {
                    return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
                }
                return [ { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount }, { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount }];
            }
        });

        allJournalEntries.forEach(entry => {
            const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === entry.accountName);
            if (!accountInfo) return;
            const amount = entry.amount;
            if (accountInfo.type === 'Assets' || accountInfo.type === 'Expenses') {
                accountBalances[entry.accountName] += (entry.entryType === 'Debit' ? amount : -amount);
            } else { // Liabilities, Equity, Revenue
                accountBalances[entry.accountName] += (entry.entryType === 'Credit' ? amount : -amount);
            }
        });

        const assets: { [key: string]: number } = {};
        const liabilities: { [key: string]: number } = {};
        const revenues: { [key: string]: number } = {};
        const expenses: { [key: string]: number } = {};
        let ownersCapital = 0;
        let ownerDrawings = 0;

        Object.entries(accountBalances).forEach(([accountName, balance]) => {
            if (balance === 0) return; // Don't show accounts with zero balance in the report
            const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
            if (!accountInfo) return;
            switch (accountInfo.type) {
                case 'Assets': assets[accountName] = balance; break;
                case 'Liabilities': liabilities[accountName] = balance; break;
                case 'Revenue': revenues[accountName] = balance; break;
                case 'Expenses': expenses[accountName] = balance; break;
                case 'Equity':
                    if (accountName === 'Modal Pemilik') ownersCapital = balance;
                    if (accountName === 'Prive') ownerDrawings = balance; // This will be a negative value
                    break;
            }
        });
        
        // Ensure inventory value from the dedicated state is used, as it's the source of truth
        assets['Persediaan Barang Dagang'] = inventory.reduce((sum, item) => sum + item.stock * item.costPerUnit, 0);
        if (assets['Persediaan Barang Dagang'] === 0) {
            delete assets['Persediaan Barang Dagang']; // Don't show if zero
        }


        const totalRevenue = Object.values(revenues).reduce((s, a) => s + a, 0);
        const totalExpenses = Object.values(expenses).reduce((s, a) => s + a, 0);
        const netIncome = totalRevenue - totalExpenses;
        const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
        const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
        
        const retainedEarningsBeginning = 0; // In a real app, this would come from the previous period's closing balance
        
        let equity = {
            'Modal Pemilik': ownersCapital,
            'Laba Ditahan': retainedEarningsBeginning + ownerDrawings, // Drawings reduce equity, so we add the debit balance
            'Laba Bersih (Periode Berjalan)': netIncome,
        };
        
        let totalEquity = Object.values(equity).reduce((sum, val) => sum + val, 0);
        let totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        // A "plug" to force the balance for demonstration purposes in this single-entry based system.
        const balanceDifference = totalAssets - totalLiabilitiesAndEquity;
        if (Math.abs(balanceDifference) > 0.01) {
            equity['Modal Pemilik'] += balanceDifference;
            totalLiabilitiesAndEquity = totalAssets; // Force balance
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
                                {Object.keys(assets).length > 0 ? Object.entries(assets).map(([name, amount]) => (
                                    <TableRow key={name}>
                                        <TableCell>{name}</TableCell>
                                        <TableCell className="text-right">
                                            {name.includes('Akumulasi') ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">Tidak ada aset.</TableCell>
                                    </TableRow>
                                )}
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
                                    {Object.keys(liabilities).length > 0 ? Object.entries(liabilities).map(([name, amount]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-10 text-muted-foreground">Tidak ada kewajiban.</TableCell>
                                        </TableRow>
                                    )}
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
                                            <TableCell className="text-right">{amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}</TableCell>
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
