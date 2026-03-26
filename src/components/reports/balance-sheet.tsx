
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
        const accountBalances: { [key: string]: number } = {};
        CHART_OF_ACCOUNTS.forEach(acc => { accountBalances[acc.name] = 0; });

        const allJournalEntries = transactions.flatMap(t => {
            const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
            const accountType = account?.type;
            const cashAccountName = "Kas";

            // Special handling for non-cash entries like depreciation
            if (t.category === 'Beban Penyusutan') {
                return [
                    { ...t, entryType: 'Debit', accountName: 'Beban Penyusutan', amount: t.amount },
                    { ...t, entryType: 'Credit', accountName: 'Akumulasi Penyusutan - Peralatan', amount: t.amount }
                ];
            }
             if (t.category === 'Beban Amortisasi') {
                return [
                    { ...t, entryType: 'Debit', accountName: 'Beban Amortisasi', amount: t.amount },
                    { ...t, entryType: 'Credit', accountName: 'Akumulasi Amortisasi', amount: t.amount }
                ];
            }

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

        // --- Income Statement Calculation for Net Income ---
        const revenues: { [key: string]: number } = {};
        const expenses: { [key: string]: number } = {};
        Object.entries(accountBalances).forEach(([accountName, balance]) => {
            const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
            if (!accountInfo || balance === 0) return;
            if (accountInfo.type === 'Revenue') revenues[accountName] = balance;
            if (accountInfo.type === 'Expenses') expenses[accountName] = balance;
        });
        const totalRevenue = Object.values(revenues).reduce((s, a) => s + a, 0);
        const totalExpenses = Object.values(expenses).reduce((s, a) => s + a, 0);
        const netIncome = totalRevenue - totalExpenses;

        // --- Balance Sheet Account Grouping ---
        const assets: { [key: string]: number } = {};
        const liabilities: { [key: string]: number } = {};
        const equity: { [key: string]: number } = {};
        
        Object.entries(accountBalances).forEach(([accountName, balance]) => {
            const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
            if (!accountInfo) return;
            
            // Only include accounts with non-zero balance, except for Cash and Inventory
            if (balance === 0 && !['Kas', 'Persediaan Barang Dagang'].includes(accountName)) return;

            switch (accountInfo.type) {
                case 'Assets':
                    assets[accountName] = balance;
                    break;
                case 'Liabilities':
                    if(balance !== 0) liabilities[accountName] = balance;
                    break;
                case 'Equity':
                    if (balance !== 0) {
                      equity[accountName] = (equity[accountName] || 0) + balance;
                    }
                    break;
            }
        });
        
        // Ensure inventory value from the dedicated state is used for consistency
        assets['Persediaan Barang Dagang'] = inventory.reduce((sum, item) => sum + item.stock * item.costPerUnit, 0);

        const equityAccounts = {
            'Modal Pemilik': accountBalances['Modal Pemilik'] || 0,
            'Prive': accountBalances['Prive'] || 0,
            'Laba Bersih (Periode Berjalan)': netIncome,
        };
        
        const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
        const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
        const totalEquity = Object.values(equityAccounts).reduce((sum, val) => sum + val, 0);
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        return { assets, liabilities, equity: equityAccounts, totalAssets, totalLiabilitiesAndEquity };

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
                                            {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
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
