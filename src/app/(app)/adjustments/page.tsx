'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdjustmentsPage() {
  const { transactions, companyProfile, deleteTransaction } = useAppState();

  const adjustments = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'journal-entry')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  if (!companyProfile?.isEnterpriseMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Mode Enterprise Dinonaktifkan</h2>
        <p className="text-muted-foreground mb-4">
          Fitur Jurnal Penyesuaian hanya tersedia untuk Mode Enterprise. Aktifkan Mode Enterprise di menu Pengaturan.
        </p>
        <Button asChild>
          <Link href="/settings">Buka Pengaturan</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jurnal Penyesuaian"
        description="Kelola jurnal penyesuaian manual dan entri akrual ganda Anda."
      >
        <Button asChild>
          <Link href="/adjustments/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Jurnal Baru
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Jurnal Penyesuaian</CardTitle>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Belum ada jurnal penyesuaian yang dicatat.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Akun Terlibat</TableHead>
                  <TableHead className="text-right">Total Debit/Kredit</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {new Date(entry.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      {entry.journalLines?.length || 0} Akun
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(
                        entry.journalLines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menghapus jurnal ini?')) {
                            deleteTransaction(entry.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
