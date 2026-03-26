
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface CashFlowData {
    operatingFlows: { name: string, amount: number }[];
    totalOperating: number;
    investingFlows: { name: string, amount: number }[];
    totalInvesting: number;
    financingFlows: { name: string, amount: number }[];
    totalFinancing: number;
    netCashFlow: number;
    beginningCash: number;
    endingCash: number;
}

const ReportSection = ({ title, items, total }: { title: string; items: { name: string, amount: number }[]; total: number }) => {
    if (items.length === 0 && total === 0) return null;

    return (
        <>
            <TableRow className="font-bold">
                <TableCell>{title}</TableCell>
                <TableCell></TableCell>
            </TableRow>
            {items.map((item, index) => (
                <TableRow key={`${title}-${index}-${item.name}`}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">{item.amount < 0 ? `(${formatCurrency(Math.abs(item.amount))})` : formatCurrency(item.amount)}</TableCell>
                </TableRow>
            ))}
            <TableRow className="font-medium bg-secondary/50">
                <TableCell className="pl-4">{`Total Arus Kas dari ${title}`}</TableCell>
                <TableCell className="text-right">{total < 0 ? `(${formatCurrency(Math.abs(total))})` : formatCurrency(total)}</TableCell>
            </TableRow>
        </>
    );
};


export function CashFlowStatement({ data }: { data: CashFlowData }) {
    const {
        operatingFlows,
        totalOperating,
        investingFlows,
        totalInvesting,
        financingFlows,
        totalFinancing,
        netCashFlow,
        beginningCash,
        endingCash
    } = data;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Laporan Arus Kas</CardTitle>
                <CardDescription>Ringkasan arus kas masuk dan keluar dari aktivitas operasi, investasi, dan pendanaan.</CardDescription>
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
                        <ReportSection title="Aktivitas Operasi" items={operatingFlows} total={totalOperating} />
                        <ReportSection title="Aktivitas Investasi" items={investingFlows} total={totalInvesting} />
                        <ReportSection title="Aktivitas Pendanaan" items={financingFlows} total={totalFinancing} />

                        <TableRow className="font-bold">
                            <TableCell>Kenaikan (Penurunan) Bersih Kas</TableCell>
                            <TableCell className="text-right">{netCashFlow < 0 ? `(${formatCurrency(Math.abs(netCashFlow))})` : formatCurrency(netCashFlow)}</TableCell>
                        </TableRow>
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell>Saldo Kas Awal Periode</TableCell>
                            <TableCell className="text-right">{formatCurrency(beginningCash)}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold text-lg">
                            <TableCell>Saldo Kas Akhir Periode</TableCell>
                            <TableCell className="text-right">{formatCurrency(endingCash)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
}
