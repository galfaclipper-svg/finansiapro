'use client';

import * as React from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

export function GeneralJournal() {
    const { transactions } = useAppState();

    const journalEntries = transactions.flatMap(t => {
        const account = CHART_OF_ACCOUNTS.find(a => a.name === t.category);
        const accountType = account?.type;
        const cashAccountName = "Cash"; // Use a specific cash account from COA

        if (t.type === 'cash-in') {
            // Debit Cash, Credit Revenue/Equity etc.
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
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (a.id > b.id ? 1 : -1) || (a.entryType === 'Debit' ? -1 : 1));

    const groupedEntries = journalEntries.reduce((acc, entry) => {
        (acc[entry.id] = acc[entry.id] || []).push(entry);
        return acc;
    }, {} as Record<string, typeof journalEntries>);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Jurnal Umum</CardTitle>
                <CardDescription>Catatan kronologis semua transaksi keuangan dalam format debit/kredit.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Tanggal</TableHead>
                            <TableHead>Akun dan Keterangan</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Kredit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.values(groupedEntries).map((entries, index) => (
                           <React.Fragment key={entries[0].id}>
                                {entries.map((entry, entryIndex) => (
                                    <TableRow key={entry.key} className="data-[entry='credit']:border-b-0">
                                        {entryIndex === 0 && <TableCell rowSpan={entries.length} className="align-top">{format(new Date(entry.date), 'd MMM y', { locale: id })}</TableCell>}
                                        <TableCell className={cn(entry.entryType === 'Credit' && 'pl-8')}>
                                            {entry.accountName}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {entry.entryType === 'Debit' ? formatCurrency(entry.amount) : null}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {entry.entryType === 'Credit' ? formatCurrency(entry.amount) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                     <TableCell></TableCell>
                                     <TableCell colSpan={3} className="text-muted-foreground text-xs pl-8 pb-4">
                                        ({entries[0].description})
                                     </TableCell>
                                </TableRow>
                           </React.Fragment>
                        ))}
                         {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">Tidak ada transaksi.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
