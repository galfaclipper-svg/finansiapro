'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppState } from '@/hooks/use-app-state';
import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/lib/types';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';

const accountSchema = z.object({
  id: z.string().min(1, 'ID Akun wajib diisi'),
  name: z.string().min(1, 'Nama Akun wajib diisi'),
  type: z.enum(['Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses']),
  category: z.enum([
    'Current Assets',
    'Fixed Assets',
    'Intangible Assets',
    'Current Liabilities',
    'Long-term Liabilities',
    'Owner Equity',
    'Sales Revenue',
    'Other Revenue',
    'Cost of Goods Sold',
    'Operating Expenses',
  ]),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function AccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAppState();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const activeAccounts = accounts.length > 0 ? accounts : CHART_OF_ACCOUNTS;

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      id: '',
      name: '',
      type: 'Assets',
      category: 'Current Assets',
    },
  });

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      form.reset({
        id: account.id,
        name: account.name,
        type: account.type,
        category: account.category,
      });
    } else {
      setEditingAccount(null);
      form.reset({
        id: '',
        name: '',
        type: 'Assets',
        category: 'Current Assets',
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: AccountFormValues) => {
    try {
      if (editingAccount) {
        // If it's a system account, we shouldn't allow changing name or type/category ideally,
        // but since we disable the fields in the UI, we just update what's allowed.
        const updatedAccount: Account = {
          ...editingAccount,
          ...values,
          isSystem: editingAccount.isSystem, // preserve system flag
        };
        await updateAccount(updatedAccount);
        toast({ title: 'Akun berhasil diperbarui' });
      } else {
        // Check if ID already exists
        if (activeAccounts.some((a) => a.id === values.id)) {
          toast({ variant: 'destructive', title: 'ID Akun sudah digunakan' });
          return;
        }
        await addAccount({ ...values, isSystem: false });
        toast({ title: 'Akun berhasil ditambahkan' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal menyimpan akun' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus akun ini?')) {
      try {
        await deleteAccount(id);
        toast({ title: 'Akun berhasil dihapus' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal menghapus akun' });
      }
    }
  };

  const sortedAccounts = [...activeAccounts].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Bagan Akun"
          description="Kelola daftar akun (Chart of Accounts) standar untuk pembukuan Anda."
        />
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Akun Baru
        </Button>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">ID Akun</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {account.name}
                    {account.isSystem && (
                      <ShieldAlert className="h-3 w-3 text-amber-500" title="Akun Sistem" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{account.type}</TableCell>
                <TableCell>{account.category}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(account)}
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {!account.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account.id)}
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {sortedAccounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Belum ada akun terdaftar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Akun</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: 1011" {...field} disabled={editingAccount?.isSystem} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Akun</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Kas Bank" {...field} disabled={editingAccount?.isSystem} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={editingAccount?.isSystem}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Tipe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Assets">Assets (Aset)</SelectItem>
                        <SelectItem value="Liabilities">Liabilities (Kewajiban)</SelectItem>
                        <SelectItem value="Equity">Equity (Ekuitas)</SelectItem>
                        <SelectItem value="Revenue">Revenue (Pendapatan)</SelectItem>
                        <SelectItem value="Expenses">Expenses (Beban)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={editingAccount?.isSystem}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Current Assets">Current Assets</SelectItem>
                        <SelectItem value="Fixed Assets">Fixed Assets</SelectItem>
                        <SelectItem value="Intangible Assets">Intangible Assets</SelectItem>
                        <SelectItem value="Current Liabilities">Current Liabilities</SelectItem>
                        <SelectItem value="Long-term Liabilities">Long-term Liabilities</SelectItem>
                        <SelectItem value="Owner Equity">Owner Equity</SelectItem>
                        <SelectItem value="Sales Revenue">Sales Revenue</SelectItem>
                        <SelectItem value="Other Revenue">Other Revenue</SelectItem>
                        <SelectItem value="Cost of Goods Sold">Cost of Goods Sold (HPP)</SelectItem>
                        <SelectItem value="Operating Expenses">Operating Expenses</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
