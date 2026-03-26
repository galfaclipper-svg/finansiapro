
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as LedgerTableFooter } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface GeneralLedgerData {
    sortedLedgerAccounts: any[];
}

export function GeneralLedger({ data }: { data: GeneralLedgerData }) {
    const { sortedLedgerAccounts } = data;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Buku Besar</CardTitle>
                <CardDescription>Rincian semua transaksi yang dipisahkan berdasarkan masing-masing akun.</CardDescription>
            </CardHeader>
            <CardContent>
                 {sortedLedgerAccounts.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {sortedLedgerAccounts.map(({ accountInfo, entries, balance }) => (
                            <AccordionItem value={accountInfo.name} key={accountInfo.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full pr-4">
                                        <span className="font-bold text-left">{accountInfo.id} - {accountInfo.name}</span>
                                        <span className="font-mono">{formatCurrency(balance)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {entries.length > 0 ? (
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
                                                {entries.map((entry: any, index: number) => (
                                                    <TableRow key={`${entry.id}-${entry.entryType}-${index}`}>
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
                                    ) : (
                                        <div className="text-center p-4 text-sm text-muted-foreground">
                                            Tidak ada transaksi untuk periode ini.
                                        </div>
                                    )}
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
