'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-app-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { ItemForm } from '@/components/inventory/item-form';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/lib/types';


export default function InventoryPage() {
    const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppState();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleOpenDialog = (item: InventoryItem | null = null) => {
        setItemToEdit(item);
        setIsDialogOpen(true);
    };

    const handleOpenAlert = (itemId: string) => {
        setItemToDelete(itemId);
        setIsAlertOpen(true);
    }
    
    const handleFormSubmit = (values: Omit<InventoryItem, 'id'>) => {
        setIsSubmitting(true);
        try {
            if (itemToEdit) {
                updateInventoryItem({ ...values, id: itemToEdit.id });
                toast({ title: "Barang Diperbarui", description: `Data untuk ${values.name} telah disimpan.` });
            } else {
                addInventoryItem(values);
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
        <Button onClick={() => handleOpenDialog()}>
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
                                <TableCell>{formatCurrency(item.salePrice)}</TableCell>
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
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
