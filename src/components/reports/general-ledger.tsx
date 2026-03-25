'use client';

import * as React from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as LedgerTableFooter } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { useMemo } from 'react';

export function GeneralLedger() {
    const { transactions } = useAppState();

    const journalEntries = useMemo(() => transactions.flatMap(t => {
        const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
        const accountType = account?.type;
        const cashAccountName = "Kas"; // Use a specific cash account from COA

        if (t.type === 'cash-in') {
            // Debit Cash, Credit the other account
            return [
                { ...t, entryType: 'Debit', accountName: cashAccountName, amount: t.amount, key: `${t.id}-debit` },
                { ...t, entryType: 'Credit', accountName: t.category, amount: t.amount, key: `${t.id}-credit` },
            ];
        } else { // cash-out
            if (accountType === 'Assets' && t.category !== cashAccountName) {
                 // e.g., Buying inventory: Debit Inventory, Credit Cash
                return [
                    { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount, key: `${t.id}-debit` },
                    { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount, key: `${t.id}-credit` },
                ];
            }
             // e.g., Paying expense: Debit Expense, Credit Cash
            return [
                { ...t, entryType: 'Debit', accountName: t.category, amount: t.amount, key: `${t.id}-debit` },
                { ...t, entryType: 'Credit', accountName: cashAccountName, amount: t.amount, key: `${t.id}-credit` },
            ];
        }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [transactions]);


    const ledgerAccounts = useMemo(() => {
        const accountsData: { [key: string]: { entries: any[], balance: number, accountInfo: typeof CHART_OF_ACCOUNTS[0] } } = {};

        const allAccountNames = [...new Set(journalEntries.map(e => e.accountName))];
        
        // Ensure all COA accounts are included even if they have no transactions
        CHART_OF_ACCOUNTS.forEach(coa => {
             if (!allAccountNames.includes(coa.name)) {
                 allAccountNames.push(coa.name);
            }
        });


        allAccountNames.forEach(accountName => {
            const accountInfo = CHART_OF_ACCOUNTS.find(a => a.name === accountName);
            // Only process if it's a valid account
            if (!accountInfo) return;

            const entriesForAccount = journalEntries.filter(entry => entry.accountName === accountName);
            let runningBalance = 0;
            
            const entriesWithBalance = entriesForAccount.map(entry => {
                 const debit = entry.entryType === 'Debit' ? entry.amount : 0;
                 const credit = entry.entryType === 'Credit' ? entry.amount : 0;
                 
                 // Assets & Expenses increase with Debit
                 if (accountInfo.type === 'Assets' || accountInfo.type === 'Expenses') {
                     runningBalance += debit - credit;
                 } 
                 // Liabilities, Equity, & Revenue increase with Credit
                 else {
                     runningBalance += credit - debit;
                 }

                return {...entry, balance: runningBalance};
            });
            
            accountsData[accountName] = {
                entries: entriesWithBalance,
                balance: runningBalance,
                accountInfo,
            };
        });

        return Object.values(accountsData).filter(data => data.entries.length > 0).sort((a, b) => {
            return (a.accountInfo?.id ?? 9999) > (b.accountInfo?.id ?? 9999) ? 1 : -1;
        });

    }, [journalEntries]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Buku Besar</CardTitle>
                <CardDescription>Rincian semua transaksi yang dipisahkan berdasarkan masing-masing akun.</CardDescription>
            </CardHeader>
            <CardContent>
                 {ledgerAccounts.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {ledgerAccounts.map(({ accountInfo, entries, balance }) => (
                            <AccordionItem value={accountInfo.name} key={accountInfo.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full pr-4">
                                        <span className="font-bold text-left">{accountInfo.id} - {accountInfo.name}</span>
                                        <span className="font-mono">{formatCurrency(balance)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">Tanggal</TableHead>
                                                <TableHead>Keterangan</TableHead>
                                                <TableHead className="text-right">Debit</TableHead>
                                                <TableHead className="text-right">Kredit</TableHead>
                                                <TableHead className="text-right">Saldo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((entry) => (
                                                <TableRow key={entry.key}>
                                                    <TableCell>{format(new Date(entry.date), 'd MMM y', { locale: id })}</TableCell>
                                                    <TableCell>{entry.description}</TableCell>
                                                    <TableCell className="text-right">
                                                        {entry.entryType === 'Debit' ? formatCurrency(entry.amount) : ''}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {entry.entryType === 'Credit' ? formatCurrency(entry.amount) : ''}
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatCurrency(entry.balance)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                         <LedgerTableFooter>
                                            <TableRow>
                                                <TableCell colSpan={4} className="font-bold text-right">Saldo Akhir</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(balance)}</TableCell>
                                            </TableRow>
                                        </LedgerTableFooter>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 ) : (
                     <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
