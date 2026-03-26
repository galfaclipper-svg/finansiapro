'use client';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAppState } from '@/hooks/use-app-state';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileUp, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Transaction } from '@/lib/types';

const profileSchema = z.object({
  name: z.string().min(3, "Nama perusahaan minimal 3 karakter."),
  address: z.string().min(10, "Alamat terlalu pendek."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
    const { companyProfile, setCompanyProfile, setTransactions, resetData } = useAppState();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: companyProfile.name,
            address: companyProfile.address,
        },
    });

    function onSubmit(data: ProfileFormValues) {
        setCompanyProfile(data);
        toast({
            title: "Profil Diperbarui",
            description: "Detail perusahaan Anda telah disimpan.",
        });
    }

    function handleReset() {
        if (confirm("Apakah Anda yakin ingin mereset semua data? Tindakan ini tidak dapat diurungkan. Seluruh data transaksi dan inventaris akan diganti dengan data demo yang komprehensif.")) {
            resetData();
            toast({
                title: "Data Direset",
                description: "Semua data aplikasi telah direset ke data demo.",
            });
            form.reset({ name: "FinansiaPro Demo Store", address: "123 E-Commerce Ave, Online City, 12345" });
        }
    }
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const journalSheetName = "Jurnal Umum";
                const worksheet = workbook.Sheets[journalSheetName];
                if (!worksheet) {
                    throw new Error(`Sheet "${journalSheetName}" tidak ditemukan di file XLSX.`);
                }
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

                // This is a simplified import logic. It reconstructs transactions from a journal.
                // It groups entries by ID and tries to build a single transaction.
                const entriesById = jsonData.reduce((acc, row) => {
                    const id = row.ID;
                    if (!acc[id]) {
                        acc[id] = [];
                    }
                    acc[id].push(row);
                    return acc;
                }, {} as { [key: string]: any[] });


                const importedTransactions: Transaction[] = Object.values(entriesById).map((entries: any[]) => {
                    const firstEntry = entries[0];
                    const cashEntry = entries.find(e => e.Akun === 'Kas');
                    const nonCashEntry = entries.find(e => e.Akun !== 'Kas');
                    
                    if (!nonCashEntry) {
                        // Handle cases like prive/modal which might only have one other side vs Kas
                         const otherEntry = entries.find(e => e.ID === firstEntry.ID);
                         if (!otherEntry) return null; // Should not happen
                         return {
                             id: firstEntry.ID,
                             date: new Date(firstEntry.Tanggal).toISOString().split('T')[0],
                             description: firstEntry.Deskripsi,
                             category: otherEntry.Akun,
                             amount: parseFloat(otherEntry.Debit || otherEntry.Kredit || 0),
                             type: (otherEntry.Debit || 0) > 0 ? 'cash-out' : 'cash-in',
                             accountId: '', 
                         };
                    }

                    const type = (cashEntry?.Debit || 0) > 0 ? 'cash-in' : 'cash-out';

                    return {
                        id: firstEntry.ID,
                        date: new Date(firstEntry.Tanggal).toISOString().split('T')[0],
                        description: firstEntry.Deskripsi,
                        category: nonCashEntry.Akun,
                        amount: parseFloat(firstEntry.Debit || firstEntry.Kredit || 0),
                        type: type,
                        accountId: '', // Not available in this format
                    };
                }).filter(t => t !== null) as Transaction[];


                setTransactions(importedTransactions);
                toast({
                    title: 'Impor Berhasil',
                    description: `${importedTransactions.length} transaksi berhasil diimpor dari file.`
                });

            } catch (error: any) {
                console.error("Gagal mengimpor file:", error);
                toast({
                    variant: 'destructive',
                    title: 'Impor Gagal',
                    description: error.message || 'Terjadi kesalahan saat memproses file XLSX.'
                });
            }
        };
        reader.readAsBinaryString(file);
        // Reset file input value to allow re-uploading the same file
        if (event.target) {
            event.target.value = '';
        }
    };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Pengaturan"
        description="Kelola profil perusahaan dan data aplikasi Anda."
      />
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
                <CardTitle>Profil Perusahaan</CardTitle>
                <CardDescription>Perbarui informasi perusahaan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nama Perusahaan</FormLabel>
                        <FormControl>
                            <Input placeholder="Your Company LLC" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Alamat</FormLabel>
                        <FormControl>
                            <Input placeholder="123 Main St, Anytown, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div>
                  <FormLabel>Logo Perusahaan</FormLabel>
                   <div className="mt-2">
                       <Button asChild variant="outline">
                        <label>
                            <Upload className="mr-2 h-4 w-4" />
                            Unggah Logo
                            <input type="file" className="sr-only" accept="image/*" />
                        </label>
                    </Button>
                   </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit">Simpan Perubahan</Button>
            </CardFooter>
            </form>
            </Form>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Manajemen Data</CardTitle>
                <CardDescription>Impor, ekspor, atau reset data aplikasi Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button variant="outline" className="w-full justify-start gap-2" onClick={handleImportClick}>
                    <FileUp className="h-4 w-4" /> Impor dari XLSX
               </Button>
               <input
                    type="file"
                    ref={fileInputRef}
                    className="sr-only"
                    accept=".xlsx, .xls"
                    onChange={handleFileImport}
                />
               <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleReset}>
                    <Trash2 className="h-4 w-4" /> Reset Semua Data
               </Button>
            </CardContent>
        </Card>

      </div>

    </div>
  );
}
