"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/hooks/use-app-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search, Store } from "lucide-react";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { useToast } from "@/hooks/use-toast";
import type { Supplier } from "@/lib/types";

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useAppState();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest">("newest");

  const filteredAndSortedSuppliers = useMemo(() => {
    let result = [...(suppliers || [])];

    // Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(sup => 
        sup.name.toLowerCase().includes(lowerQuery) || 
        (sup.contact && sup.contact.includes(searchQuery))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      } else {
        const timeA = parseInt(a.id.split('-')[1] || "0");
        const timeB = parseInt(b.id.split('-')[1] || "0");
        return timeB - timeA;
      }
    });

    return result;
  }, [suppliers, searchQuery, sortBy]);

  const handleOpenDialog = (supplier: Supplier | null = null) => {
    setSupplierToEdit(supplier);
    setIsDialogOpen(true);
  };

  const handleOpenAlert = (supplierId: string) => {
    setSupplierToDelete(supplierId);
    setIsAlertOpen(true);
  };

  const handleFormSubmit = async (values: Omit<Supplier, "id">) => {
    setIsSubmitting(true);
    try {
      if (supplierToEdit) {
        await updateSupplier({ ...values, id: supplierToEdit.id });
        toast({ title: "Pemasok Diperbarui", description: `Data ${values.name} telah disimpan.` });
      } else {
        await addSupplier(values);
        toast({ title: "Pemasok Ditambahkan", description: `${values.name} telah ditambahkan.` });
      }
      setIsDialogOpen(false);
      setSupplierToEdit(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Tidak dapat menyimpan data pemasok." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (supplierToDelete) {
      const supplier = suppliers.find((c) => c.id === supplierToDelete);
      await deleteSupplier(supplierToDelete);
      toast({ title: "Pemasok Dihapus", description: `Pemasok "${supplier?.name}" telah dihapus.` });
      setIsAlertOpen(false);
      setSupplierToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Master Data Pemasok" 
        description="Kelola daftar pemasok (vendor/supplier) untuk kebutuhan persediaan bisnis Anda."
        icon={<Store className="w-8 h-8 text-primary" />}
        action={
          <Button onClick={() => handleOpenDialog(null)} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Tambah Pemasok
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Daftar Pemasok</CardTitle>
              <CardDescription>Semua pemasok atau vendor yang terdaftar di sistem.</CardDescription>
            </div>
            <div className="flex gap-2">
               <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari pemasok..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Terbaru</SelectItem>
                  <SelectItem value="name-asc">Nama (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Nama (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pemasok</TableHead>
                  <TableHead>Kontak / No. HP</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Belum ada data pemasok.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.contact || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={supplier.address}>{supplier.address || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={supplier.notes}>{supplier.notes || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Buka menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(supplier)}>
                              Edit Pemasok
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleOpenAlert(supplier.id)}
                            >
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{supplierToEdit ? "Edit Pemasok" : "Tambah Pemasok"}</DialogTitle>
            <DialogDescription>
              {supplierToEdit ? "Ubah detail informasi pemasok di bawah ini." : "Masukkan detail informasi pemasok baru."}
            </DialogDescription>
          </DialogHeader>
          <SupplierForm
            defaultValues={supplierToEdit || undefined}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data pemasok ini akan dihapus secara permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
