'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-app-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function InventoryPage() {
    const { inventory } = useAppState();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventaris"
        description="Lacak dan kelola tingkat stok barang dagangan Anda."
      >
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Barang
        </Button>
      </PageHeader>
        <Card>
            <CardHeader>
                <CardTitle>Barang Inventaris</CardTitle>
                <CardDescription>
                    Daftar semua produk dalam inventaris Anda.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Stok</TableHead>
                            <TableHead>Biaya Per Unit</TableHead>
                            <TableHead>Harga Jual</TableHead>
                            <TableHead className="text-right">Nilai Stok</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inventory.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.sku}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.stock}</TableCell>
                                <TableCell>{formatCurrency(item.costPerUnit)}</TableCell>
                                <TableCell>{formatCurrency(item.salePrice)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.stock * item.costPerUnit)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
