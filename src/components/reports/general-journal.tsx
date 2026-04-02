// @ts-nocheck
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface GeneralJournalData {
    journalEntries: any[];
}

export function GeneralJournal({ data }: { data: GeneralJournalData }) {
    const { journalEntries } = data;

    const groupedEntries = journalEntries.reduce((acc, entry) => {
        (acc[entry.id] = acc[entry.id] || []).push(entry);
        return acc;
    }, {} as Record<string, any[]>);


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
                        {Object.values(groupedEntries).map((entries) => (
                           <React.Fragment key={entries[0].id}>
                                {entries.map((entry, entryIndex) => (
                                    <TableRow key={`${entry.id}-${entry.entryType}`} data-entry-type={entry.entryType}>
                                        {entryIndex === 0 && <TableCell rowSpan={entries.length} className="align-top border-b-0">{format(new Date(entry.date), 'd MMM y', { locale: id })}</TableCell>}
                                        <TableCell className={cn(entry.entryType === 'Credit' && 'pl-8', 'border-b-0')}>
                                            {entry.accountName}
                                        </TableCell>
                                        <TableCell className="text-right border-b-0">
                                            {entry.entryType === 'Debit' ? formatCurrency(entry.amount) : null}
                                        </TableCell>
                                        <TableCell className="text-right border-b-0">
                                            {entry.entryType === 'Credit' ? formatCurrency(entry.amount) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                     <TableCell className="border-t-0 pt-0"></TableCell>
                                     <TableCell colSpan={3} className="text-muted-foreground text-xs pl-8 pb-4 pt-1">
                                        ({entries[0].description})
                                     </TableCell>
                                </TableRow>
                           </React.Fragment>
                        ))}
                         {journalEntries.length === 0 && (
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
