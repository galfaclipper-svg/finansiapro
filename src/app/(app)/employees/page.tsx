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
import { MoreHorizontal, PlusCircle, Search, Users, BadgeCheck, BadgeMinus } from "lucide-react";
import { EmployeeForm } from "@/components/employees/employee-form";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/lib/types";

export default function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, transactions } = useAppState();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest">("newest");

  const filteredAndSortedEmployees = useMemo(() => {
    let result = [...(employees || [])];

    // Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(emp => 
        emp.name.toLowerCase().includes(lowerQuery) || 
        (emp.position && emp.position.toLowerCase().includes(lowerQuery)) ||
        (emp.phone && emp.phone.includes(searchQuery))
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
  }, [employees, searchQuery, sortBy]);

  const handleOpenDialog = (employee: Employee | null = null) => {
    setEmployeeToEdit(employee);
    setIsDialogOpen(true);
  };

  const handleOpenAlert = (employeeId: string) => {
    // Check if employee has transactions
    const hasTransactions = transactions.some(tx => tx.employeeId === employeeId);
    if (hasTransactions) {
      toast({
        variant: "destructive",
        title: "Penghapusan Ditolak",
        description: "Karyawan ini masih memiliki histori transaksi atau hutang (Kasbon) di sistem."
      });
      return;
    }
    
    setEmployeeToDelete(employeeId);
    setIsAlertOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      if (employeeToEdit) {
        await updateEmployee({ ...values, id: employeeToEdit.id });
        toast({ title: "Data Karyawan Diperbarui", description: `Data ${values.name} telah disimpan.` });
      } else {
        const newId = `EMP-${Date.now()}`;
        await addEmployee({ ...values, id: newId });
        toast({ title: "Karyawan Ditambahkan", description: `${values.name} telah didaftarkan.` });
      }
      setIsDialogOpen(false);
      setEmployeeToEdit(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Tidak dapat menyimpan data karyawan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (employeeToDelete) {
      const employee = employees.find((c) => c.id === employeeToDelete);
      await deleteEmployee(employeeToDelete);
      toast({ title: "Karyawan Dihapus", description: `Data karyawan "${employee?.name}" telah dihapus.` });
      setIsAlertOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Master Data Karyawan" 
        description="Kelola daftar karyawan, jabatan, dan komponen gaji (pokok & tunjangan)."
        icon={<Users className="w-8 h-8 text-primary" />}
        action={
          <Button onClick={() => handleOpenDialog(null)} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Tambah Karyawan
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Daftar Karyawan</CardTitle>
              <CardDescription>Semua staf atau karyawan yang terdaftar di perusahaan Anda.</CardDescription>
            </div>
            <div className="flex gap-2">
               <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari karyawan..."
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
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada data karyawan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.position || "-"}</TableCell>
                      <TableCell>{employee.phone || "-"}</TableCell>
                      <TableCell className="text-green-700 font-medium">
                        {formatRupiah(employee.basicSalary || 0)}
                      </TableCell>
                      <TableCell>
                        {employee.isActive !== false ? (
                           <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                             <BadgeCheck className="w-3.5 h-3.5" /> Aktif
                           </div>
                        ) : (
                           <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                             <BadgeMinus className="w-3.5 h-3.5" /> Non-aktif
                           </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Buka menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(employee)}>
                              Edit Data
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleOpenAlert(employee.id)}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{employeeToEdit ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}</DialogTitle>
            <DialogDescription>
              {employeeToEdit ? "Ubah detail informasi karyawan di bawah ini." : "Masukkan detail profil dan komponen gaji karyawan baru."}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            defaultValues={employeeToEdit || undefined}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Karyawan akan dihapus secara permanen dari daftar master. Pastikan karyawan tidak memiliki hutang kasbon sebelum dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
