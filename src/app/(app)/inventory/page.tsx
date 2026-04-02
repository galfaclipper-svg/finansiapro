'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-app-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, AlertCircle, CheckCircle2, FileSpreadsheet, FileText } from 'lucide-react';
import { ItemForm } from '@/components/inventory/item-form';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/lib/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InventoryPage() {
    const { companyProfile, inventory, transactions, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppState();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- New Calculations ---
    const totalPcs = useMemo(() => inventory.reduce((sum, item) => sum + item.stock, 0), [inventory]);
    const totalValue = useMemo(() => inventory.reduce((sum, item) => sum + (item.stock * item.costPerUnit), 0), [inventory]);

    const neracaBalance = useMemo(() => {
        let balance = 0;
        transactions.forEach(t => {
            // Purchases of inventory recorded directly to 'Persediaan Barang Dagang'
            if (t.category === 'Persediaan Barang Dagang') {
                if (t.type === 'cash-out') {
                    balance += t.amount;
                } else {
                    balance -= t.amount;
                }
            }
            // Cost of Goods Sold logic from reports/page.tsx
            const isSale = t.type === 'cash-in' && t.category.startsWith('Pendapatan Penjualan');
            if (isSale) {
                if (t.items && t.items.length > 0) {
                    t.items.forEach((itemEntry: any) => {
                        const item = inventory.find(i => i.id === itemEntry.itemId);
                        if (item) {
                            balance -= (item.costPerUnit * itemEntry.quantity);
                        }
                    });
                } else if (t.itemId && t.quantity) {
                    const item = inventory.find(i => i.id === t.itemId);
                    if (item) {
                        balance -= (item.costPerUnit * t.quantity);
                    }
                }
            }
        });
        return balance;
    }, [transactions, inventory]);

    const balanceDifference = totalValue - neracaBalance;
    const isBalanced = Math.abs(balanceDifference) < 1;
    // ------------------------

    const exportToXLSX = () => {
        if (inventory.length === 0) {
            toast({ variant: 'destructive', title: "Inventaris Kosong", description: "Tidak ada data barang untuk diekspor." });
            return;
        }
        try {
            const data: any[][] = [];
            data.push(["LAPORAN INVENTARIS FISIK"]);
            data.push(["Tanggal Cetak:", new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })]);
            data.push([]);
            data.push(["No", "SKU", "Nama Barang", "Stok (Pcs)", "Biaya Per Unit", "Total Nilai Stok"]);

            let rowIndex = 5; // Start data at row 5
            inventory.forEach((item, index) => {
                data.push([
                    index + 1,
                    item.sku,
                    item.name,
                    item.stock,
                    item.costPerUnit,
                    { t: 'n', f: `D${rowIndex}*E${rowIndex}` } // Formula constraint
                ]);
                rowIndex++;
            });

            // Total row
            data.push([
                "TOTAL KESELURUHAN",
                null,
                null,
                { t: 'n', f: `SUM(D5:D${rowIndex - 1})` },
                null,
                { t: 'n', f: `SUM(F5:F${rowIndex - 1})` }
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet(data);

            // Column Widths for print readiness
            worksheet['!cols'] = [
                { wch: 5 },  // No
                { wch: 15 }, // SKU
                { wch: 35 }, // Nama Barang
                { wch: 12 }, // Stok
                { wch: 20 }, // Biaya
                { wch: 25 }, // Total
            ];

            // Merge titles
            worksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title
                { s: { r: 1, c: 1 }, e: { r: 1, c: 5 } }, // Date
                { s: { r: rowIndex - 1, c: 0 }, e: { r: rowIndex - 1, c: 2 } } // Total text spanning 3 cols
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Data Inventaris");
            XLSX.writeFile(workbook, `Laporan_Inventaris_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast({ title: "Berhasil Diekspor", description: "Laporan inventaris XLSX siap cetak telah diunduh." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Gagal Mengekspor", description: "Terjadi kesalahan saat mengekspor data." });
        }
    };

    const exportToPDF = () => {
        if (inventory.length === 0) {
            toast({ variant: 'destructive', title: "Inventaris Kosong", description: "Tidak ada data barang untuk diekspor." });
            return;
        }
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Header
            if (companyProfile.logoUrl) {
                try {
                    const typeMatch = companyProfile.logoUrl.match(/^data:image\/(png|jpeg|jpg);/);
                    const imgType = typeMatch ? (typeMatch[1] === 'jpg' ? 'JPEG' : typeMatch[1].toUpperCase()) : 'PNG';
                    doc.addImage(companyProfile.logoUrl, imgType, 14, 10, 16, 16);
                } catch(e) {
                    console.warn("Gagal menambahkan logo:", e);
                }
            }

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(companyProfile.name || "Perusahaan Saya", pageWidth / 2, 16, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text("LAPORAN INVENTARIS FISIK - FINANSIAPRO", pageWidth / 2, 23, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 30, { align: 'center' });

            doc.text(`Total Baris/Varian Barang: ${inventory.length} Item`, 14, 40);

            const tableData = inventory.map((item, index) => [
                index + 1,
                item.sku,
                item.name,
                item.stock.toLocaleString('id-ID'),
                formatCurrency(item.costPerUnit),
                formatCurrency(item.stock * item.costPerUnit)
            ]);

            // Add Total Row
            tableData.push([
                "", "", "TOTAL KESELURUHAN",
                totalPcs.toLocaleString('id-ID'),
                "",
                formatCurrency(totalValue)
            ]);

            autoTable(doc, {
                startY: 45,
                head: [['No', 'SKU', 'Nama Barang', 'Stok', 'Biaya / Unit', 'Total Nilai']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], halign: 'center' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },   // No
                    1: { halign: 'center', cellWidth: 25 },   // SKU
                    2: { cellWidth: 60 },                     // Nama
                    3: { halign: 'center', cellWidth: 15 },   // Stok
                    4: { halign: 'right', cellWidth: 35 },    // Biaya
                    5: { halign: 'right', cellWidth: 35 }     // Total
                },
                willDrawCell: (data) => {
                    // Style the last row (Totals)
                    if (data.row.index === tableData.length - 1) {
                        data.doc.setFont('helvetica', 'bold');
                        if (data.column.index === 2) {
                            data.cell.styles.halign = 'right';
                        }
                    }
                },
                margin: { left: 14, right: 14 }
            });

            doc.save(`Laporan_Inventaris_${new Date().toISOString().split('T')[0]}.pdf`);
            toast({ title: "Berhasil Diekspor", description: "Laporan inventaris PDF siap cetak telah diunduh." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Gagal Mengekspor", description: "Terjadi kesalahan saat membuat dokumen PDF." });
        }
    };

    const handleOpenDialog = (item: InventoryItem | null = null) => {
        setItemToEdit(item);
        setIsDialogOpen(true);
    };

    const handleOpenAlert = (itemId: string) => {
        setItemToDelete(itemId);
        setIsAlertOpen(true);
    }
    
    const handleFormSubmit = (values: Omit<InventoryItem, 'id' | 'stock'>) => {
        setIsSubmitting(true);
        try {
            if (itemToEdit) {
                updateInventoryItem({ ...values, id: itemToEdit.id, stock: itemToEdit.stock });
                toast({ title: "Barang Diperbarui", description: `Data untuk ${values.name} telah disimpan.` });
            } else {
                addInventoryItem({ ...values, stock: 0 });
                toast({ title: "Barang Ditambahkan", description: `${values.name} telah ditambahkan ke inventaris.` });
            }
            setIsDialogOpen(false);
            setItemToEdit(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Terjadi Kesalahan", description: "Tidak dapat menyimpan data barang." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteItem = () => {
        if (itemToDelete) {
            const item = inventory.find(i => i.id === itemToDelete);
            deleteInventoryItem(itemToDelete);
            toast({ title: "Barang Dihapus", description: `Barang "${item?.name}" telah dihapus.` });
            setIsAlertOpen(false);
            setItemToDelete(null);
        }
    };

  return (
    <>
    <div className="space-y-8">
      <PageHeader
        title="Inventaris"
        description="Lacak dan kelola tingkat stok barang dagangan Anda."
      >
        <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50" onClick={exportToXLSX}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Unduh XLSX
            </Button>
            <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50" onClick={exportToPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Unduh PDF
            </Button>
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Barang
            </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stok (Pcs)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalPcs.toLocaleString('id-ID')} Pcs</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nilai Stok Fisik</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status Balancing (Neraca)</CardTitle>
                {isBalanced ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(neracaBalance)}</div>
                <p className={`text-xs mt-1 ${isBalanced ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}`}>
                    {isBalanced 
                        ? 'Sinkron dengan Neraca' 
                        : `Selisih: ${formatCurrency(Math.abs(balanceDifference))}`
                    }
                </p>
            </CardContent>
        </Card>
      </div>

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
                            <TableHead>Nilai Stok</TableHead>
                            <TableHead className="text-right w-[80px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inventory.length > 0 ? inventory.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.sku}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.stock}</TableCell>
                                <TableCell>{formatCurrency(item.costPerUnit)}</TableCell>
                                <TableCell>{formatCurrency(item.stock * item.costPerUnit)}</TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <span className="sr-only">Buka menu aksi</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleOpenDialog(item)}>Ubah</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleOpenAlert(item.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                Hapus
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Belum ada barang di inventaris. Klik 'Tambah Barang' untuk memulai.
                                </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsDialogOpen(open)}}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>{itemToEdit ? 'Ubah Barang' : 'Tambah Barang Baru'}</DialogTitle>
                <DialogDescription>
                    {itemToEdit ? 'Perbarui detail barang Anda di bawah ini.' : 'Isi formulir untuk menambahkan item baru ke inventaris.'}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <ItemForm 
                    onSubmit={handleFormSubmit}
                    initialData={itemToEdit}
                    isSubmitting={isSubmitting}
                />
            </div>
        </DialogContent>
    </Dialog>

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini tidak dapat dibatalkan. Ini akan menghapus barang secara permanen dari inventaris Anda.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteItem}>
                    Ya, Hapus Barang
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
