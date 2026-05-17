"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/hooks/use-app-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Users } from "lucide-react";
import { ClientForm } from "@/components/clients/client-form";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient } = useAppState();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenDialog = (client: Client | null = null) => {
    setClientToEdit(client);
    setIsDialogOpen(true);
  };

  const handleOpenAlert = (clientId: string) => {
    setClientToDelete(clientId);
    setIsAlertOpen(true);
  };

  const handleFormSubmit = async (values: Omit<Client, "id">) => {
    setIsSubmitting(true);
    try {
      if (clientToEdit) {
        await updateClient({ ...values, id: clientToEdit.id });
        toast({ title: "Pelanggan Diperbarui", description: `Data ${values.name} telah disimpan.` });
      } else {
        await addClient(values);
        toast({ title: "Pelanggan Ditambahkan", description: `${values.name} telah ditambahkan.` });
      }
      setIsDialogOpen(false);
      setClientToEdit(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Tidak dapat menyimpan data pelanggan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (clientToDelete) {
      const client = clients.find((c) => c.id === clientToDelete);
      await deleteClient(clientToDelete);
      toast({ title: "Pelanggan Dihapus", description: `Pelanggan "${client?.name}" telah dihapus.` });
      setIsAlertOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Manajemen Pelanggan"
          description="Kelola data klien dan pelanggan Anda untuk keperluan penagihan (invoice)."
        >
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Pelanggan
          </Button>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Daftar Pelanggan
            </CardTitle>
            <CardDescription>
              Daftar semua klien yang pernah Anda catat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pelanggan</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>No. Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length > 0 ? (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.email || "-"}</TableCell>
                      <TableCell>{client.phone || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{client.address || "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <span className="sr-only">Buka menu aksi</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleOpenDialog(client)}>
                              Ubah
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleOpenAlert(client.id)}
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Belum ada pelanggan. Klik 'Tambah Pelanggan' untuk memulai.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{clientToEdit ? "Ubah Pelanggan" : "Tambah Pelanggan Baru"}</DialogTitle>
            <DialogDescription>
              {clientToEdit
                ? "Perbarui detail kontak pelanggan Anda di bawah ini."
                : "Isi formulir untuk menambahkan pelanggan baru."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ClientForm
              onSubmit={handleFormSubmit}
              initialData={clientToEdit}
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
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data pelanggan secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient}>
              Ya, Hapus Pelanggan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
