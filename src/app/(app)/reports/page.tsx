'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Printer } from 'lucide-react';
import { IncomeStatement } from '@/components/reports/income-statement';
import { GeneralJournal } from '@/components/reports/general-journal';
import { BalanceSheet } from '@/components/reports/balance-sheet';

const ReportPlaceholder = ({ title }: { title: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Ini adalah placeholder untuk laporan {title}.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Data {title} akan ditampilkan di sini.</p>
            </div>
        </CardContent>
    </Card>
)

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Laporan Keuangan"
        description="Hasilkan dan lihat laporan keuangan bisnis Anda."
      >
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Ekspor Semua (XLSX)
        </Button>
         <Button variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Cetak Semua (PDF)
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="income-statement">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-4">
            <TabsTrigger value="income-statement">Laporan Laba Rugi</TabsTrigger>
            <TabsTrigger value="balance-sheet">Neraca</TabsTrigger>
            <TabsTrigger value="general-journal">Jurnal Umum</TabsTrigger>
            <TabsTrigger value="cash-flow" disabled>Arus Kas</TabsTrigger>
            <TabsTrigger value="general-ledger" disabled>Buku Besar</TabsTrigger>
        </TabsList>
        <TabsContent value="income-statement">
            <IncomeStatement />
        </TabsContent>
        <TabsContent value="balance-sheet">
            <BalanceSheet />
        </TabsContent>
        <TabsContent value="general-journal">
            <GeneralJournal />
        </TabsContent>
        <TabsContent value="cash-flow">
            <ReportPlaceholder title="Laporan Arus Kas" />
        </TabsContent>
        <TabsContent value="general-ledger">
            <ReportPlaceholder title="Buku Besar" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
