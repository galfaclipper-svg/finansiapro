

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

interface BalanceSheetData {
    assets: { [key: string]: number };
    liabilities: { [key: string]: number };
    equity: { [key: string]: number };
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
}

export function BalanceSheet({ data }: { data: BalanceSheetData }) {
    const { assets, liabilities, equity, totalAssets, totalLiabilitiesAndEquity } = data;

    // Sort assets by account ID for consistent, standard ordering
    const sortedAssets = Object.entries(assets).sort(([aName], [bName]) => {
      const aId = CHART_OF_ACCOUNTS.find(acc => acc.name === aName)?.id || '9999';
      const bId = CHART_OF_ACCOUNTS.find(acc => acc.name === bName)?.id || '9999';
      return aId.localeCompare(bId);
    });
    const sortedLiabilities = Object.entries(liabilities).sort(([a], [b]) => a.localeCompare(b));

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
                                {sortedAssets.length > 0 ? sortedAssets.map(([name, amount]) => (
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
                                    {sortedLiabilities.length > 0 ? sortedLiabilities.map(([name, amount]) => (
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
                 <div className="mt-6 text-center text-sm">
                    {Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1 ? (
                        <p className="text-green-600">Neraca Seimbang</p>
                    ) : (
                        <p className="text-red-600 font-bold">Neraca Tidak Seimbang (Selisih: {formatCurrency(totalAssets - totalLiabilitiesAndEquity)})</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
