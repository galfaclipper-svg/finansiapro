'use client';

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

const profileSchema = z.object({
  name: z.string().min(3, "Nama perusahaan minimal 3 karakter."),
  address: z.string().min(10, "Alamat terlalu pendek."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
    const { companyProfile, setCompanyProfile, resetData } = useAppState();
    const { toast } = useToast();

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
        if (confirm("Apakah Anda yakin ingin mereset semua data? Tindakan ini tidak dapat diurungkan.")) {
            resetData();
            toast({
                title: "Data Direset",
                description: "Semua data aplikasi telah direset ke keadaan awal.",
            });
            form.reset({ name: "FinansiaPro Demo Store", address: "123 E-Commerce Ave, Online City, 12345" });
        }
    }

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
               <Button variant="outline" className="w-full justify-start gap-2">
                    <FileUp className="h-4 w-4" /> Impor dari XLSX
               </Button>
               <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleReset}>
                    <Trash2 className="h-4 w-4" /> Reset Semua Data
               </Button>
            </CardContent>
        </Card>

      </div>

    </div>
  );
}
