"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/hooks/use-app-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, PlusCircle, FileText, CheckCircle, Trash2, Printer, Search } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/types";

export default function InvoicesPage() {
  const { invoices, clients, updateInvoice, deleteInvoice } = useAppState();
  const { toast } = useToast();

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  // Search and Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Pelanggan Tidak Diketahui";
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(inv => {
        const cName = getClientName(inv.clientId).toLowerCase();
        return inv.number.toLowerCase().includes(lowerQuery) || cName.includes(lowerQuery);
      });
    }

    result.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === "date-asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "amount-desc") {
        return b.totalAmount - a.totalAmount;
      } else if (sortBy === "amount-asc") {
        return a.totalAmount - b.totalAmount;
      }
      return 0;
    });

    return result;
  }, [invoices, clients, searchQuery, sortBy]);

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draf</Badge>;
      case "sent":
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Terkirim</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Lunas</Badge>;
      case "overdue":
        return <Badge variant="destructive">Jatuh Tempo</Badge>;
      case "cancelled":
        return <Badge variant="outline">Dibatalkan</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        await updateInvoice({ ...invoice, status: "paid" });
        toast({ title: "Tagihan Lunas", description: `Tagihan ${invoice.number} telah ditandai lunas dan masuk ke jurnal.` });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Tidak dapat mengubah status tagihan." });
    }
  };

  const handleOpenAlert = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setIsAlertOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (invoiceToDelete) {
      const invoice = invoices.find((inv) => inv.id === invoiceToDelete);
      await deleteInvoice(invoiceToDelete);
      toast({ title: "Tagihan Dihapus", description: `Tagihan ${invoice?.number} telah dihapus.` });
      setIsAlertOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Manajemen Tagihan"
          description="Kelola tagihan (invoice), pantau pembayaran, dan cetak PDF profesional untuk klien Anda."
        >
          <Button asChild>
            <Link href="/invoices/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Tagihan Baru
            </Link>
          </Button>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nomor tagihan atau pelanggan..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Terbaru</SelectItem>
                <SelectItem value="date-asc">Terlama</SelectItem>
                <SelectItem value="amount-desc">Total Terbesar</SelectItem>
                <SelectItem value="amount-asc">Total Terkecil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Daftar Tagihan
            </CardTitle>
            <CardDescription>
              Semua tagihan yang telah Anda buat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Tagihan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedInvoices.length > 0 ? (
                  filteredAndSortedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{getClientName(invoice.clientId)}</TableCell>
                      <TableCell>{formatDate(invoice.date)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <span className="sr-only">Buka menu aksi</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/invoices/${invoice.id}/preview`} className="cursor-pointer">
                                <Printer className="mr-2 h-4 w-4" /> Cetak / Lihat PDF
                              </Link>
                            </DropdownMenuItem>
                            {invoice.status !== "paid" && (
                              <DropdownMenuItem onSelect={() => handleMarkAsPaid(invoice.id)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Tandai Lunas
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => handleOpenAlert(invoice.id)}
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {searchQuery ? "Tidak ada tagihan yang cocok dengan pencarian." : "Belum ada tagihan. Klik 'Buat Tagihan Baru' untuk memulai."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tagihan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Menghapus tagihan ini tidak akan memengaruhi transaksi jurnal yang mungkin sudah dibuat secara otomatis saat lunas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Hapus Tagihan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
