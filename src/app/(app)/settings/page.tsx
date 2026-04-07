// @ts-nocheck
'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/contexts/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileUp, FileDown, Database, Trash2, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Transaction } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { INITIAL_COMPANY_PROFILE } from '@/lib/constants';


const profileSchema = z.object({
  name: z.string().min(3, "Nama perusahaan minimal 3 karakter."),
  address: z.string().min(10, "Alamat terlalu pendek."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
    const { companyProfile, setCompanyProfile, setTransactions, transactions, inventory, setInventory, resetData, restoreBackupData } = useAppState();
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | undefined>(companyProfile.logoUrl);

     useEffect(() => {
        setLogoPreview(companyProfile.logoUrl);
    }, [companyProfile.logoUrl]);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: companyProfile.name,
            address: companyProfile.address,
        },
    });

    function onSubmit(data: ProfileFormValues) {
        setCompanyProfile(prev => ({...prev, ...data}));
        toast({
            title: "Profil Diperbarui",
            description: "Detail perusahaan Anda telah disimpan.",
        });
    }

    function handleConfirmReset() {
        resetData();
        toast({
            title: "Data Direset",
            description: "Semua data transaksi dan inventaris telah dihapus. Profil perusahaan kembali ke default.",
        });
        form.reset(INITIAL_COMPANY_PROFILE);
        setLogoPreview(undefined);
        setIsResetAlertOpen(false);
    }
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setLogoPreview(dataUrl);
            setCompanyProfile(prev => ({ ...prev, logoUrl: dataUrl }));
            toast({
                title: "Logo Diperbarui",
                description: "Logo perusahaan Anda telah diunggah.",
            });
        };
        reader.readAsDataURL(file);
        
        if (event.target) {
            event.target.value = '';
        }
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
                    
                    // Abaikan jurnal virtual (HPP dan Penyusutan) agar tidak mengurangi Kas secara keliru
                    if (firstEntry.ID && (String(firstEntry.ID).includes('-cogs') || String(firstEntry.ID).includes('-dep'))) {
                        return null;
                    }

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

    const handleBackupJSON = () => {
        const backupData = {
            transactions,
            inventory,
            companyProfile
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `Backup_FinansiaPro_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode); 
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast({ title: "Backup Berhasil", description: "File backup JSON telah diunduh dengan aman." });
    };

    const handleRestoreJSONClick = () => {
        jsonInputRef.current?.click();
    };

    const handleJSONRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.transactions && data.inventory) {
                    await restoreBackupData(data);

                    toast({
                        title: 'Restore Berhasil',
                        description: `Data aplikasi berhasil dipulihkan dari file backup JSON.`
                    });
                } else {
                    throw new Error("Format backup tidak valid.");
                }
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Restore Gagal',
                    description: error.message || 'Terjadi kesalahan saat memproses file JSON.'
                });
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    };


  return (
    <>
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
                   <div className="mt-2 flex items-center gap-4">
                       {logoPreview ? (
                            <Image src={logoPreview} alt="Logo Preview" width={48} height={48} className="rounded-md object-contain bg-muted p-1" />
                        ) : (
                            <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                                <Package className="h-6 w-6" />
                            </div>
                        )}
                       <Button asChild variant="outline">
                        <label>
                            <Upload className="mr-2 h-4 w-4" />
                            Unggah Logo
                            <input type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} />
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

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Akun Pengguna</CardTitle>
                    <CardDescription>Informasi akun Google Anda yang sedang aktif.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">Email Terdaftar</p>
                        <p className="text-sm text-muted-foreground">{user?.email || 'Memuat...'}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Manajemen Data</CardTitle>
                <CardDescription>Impor, ekspor, atau reset data aplikasi Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                   <Button variant="outline" className="w-full justify-center gap-2 border-green-600/30 text-green-700 hover:bg-green-50" onClick={handleBackupJSON}>
                        <FileDown className="h-4 w-4" /> Unduh Backup (JSON)
                   </Button>
                   <Button variant="outline" className="w-full justify-center gap-2 border-blue-600/30 text-blue-700 hover:bg-blue-50" onClick={handleRestoreJSONClick}>
                        <Database className="h-4 w-4" /> Restore Data (JSON)
                   </Button>
               </div>
               <input
                    type="file"
                    ref={jsonInputRef}
                    className="sr-only"
                    accept=".json"
                    onChange={handleJSONRestore}
                />
               <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Opsi Lainnya</span></div>
               </div>
               <Button variant="outline" className="w-full justify-start gap-2" onClick={handleImportClick}>
                    <FileUp className="h-4 w-4" /> Impor dari Jurnal Manual (XLSX)
               </Button>
               <input
                    type="file"
                    ref={fileInputRef}
                    className="sr-only"
                    accept=".xlsx, .xls"
                    onChange={handleFileImport}
                />
               <Button variant="destructive" className="w-full justify-start gap-2" onClick={() => setIsResetAlertOpen(true)}>
                    <Trash2 className="h-4 w-4" /> Reset Semua Data
               </Button>
            </CardContent>
        </Card>
        </div>

      </div>
    </div>
    <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini tidak dapat dibatalkan. Seluruh data transaksi dan inventaris akan dihapus secara permanen. Profil perusahaan akan dikembalikan ke pengaturan default.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReset}>
                    Ya, Reset Data
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
