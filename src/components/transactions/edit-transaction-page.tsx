"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAppState } from "@/hooks/use-app-state";
import { CHART_OF_ACCOUNTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import { useRouter } from "next/navigation";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Account, Transaction } from "@/lib/types";

const transactionSchema = z.object({
  date: z.date({
    required_error: "Tanggal harus diisi.",
  }),
  amount: z.coerce.number().positive("Jumlah harus positif."),
  description: z.string().min(2, "Deskripsi terlalu pendek."),
  type: z.enum(["cash-in", "cash-out"], { required_error: "Tipe harus diisi." }),
  category: z.string({ required_error: "Silakan pilih kategori." }),
  items: z.array(z.object({
    itemId: z.string().min(1, "Silakan pilih barang."),
    quantity: z.coerce.number().positive("Kuantitas harus positif."),
  })).optional(),
  usefulLifeInMonths: z.coerce.number().optional(),
  salvageValue: z.coerce.number().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const EXCLUDED_MANUAL_CATEGORIES = [
    'Akumulasi Penyusutan - Peralatan',
    'Akumulasi Amortisasi',
    'Beban Penyusutan',
    'Beban Amortisasi',
    'Laba Ditahan',
    'Harga Pokok Penjualan',
    'Kas',
    'Bank',
];

export default function EditTransactionPage({ transactionId }: { transactionId: string }) {
  const { transactions, updateTransaction, inventory } = useAppState();
  const { toast } = useToast();
  const router = useRouter();

  const transaction = transactions.find((t) => t.id === transactionId);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      type: "cash-out",
      amount: undefined,
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        date: new Date(transaction.date),
        amount: transaction.amount,
        description: transaction.description,
        type: transaction.type as "cash-in" | "cash-out",
        category: transaction.category,
        items: transaction.items || (transaction.itemId && transaction.quantity ? [{ itemId: transaction.itemId, quantity: transaction.quantity }] : undefined),
        usefulLifeInMonths: transaction.usefulLifeInMonths,
        salvageValue: transaction.salvageValue,
      });
    }
  }, [transaction, form]);

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedType = form.watch("type");
  const watchedCategory = form.watch("category");
  const watchedItems = form.watch("items");

  // Only reset category when type changes *and* it's not the initial load of the edit data.
  // Actually, resetting `category` on type change can wipe out initial loaded data, so we need to be careful.
  // We can skip resetting it here because the user is just editing.
  // However, if they change the type manually, we should clear category.
  // Instead of an effect, we'll conditionally reset it if it doesn't match the valid categories.

  const filteredCategories = useMemo(() => {
    let baseFilter;

    if (watchedType === 'cash-in') {
      baseFilter = (acc: Account) => 
        acc.type === 'Revenue' || 
        (acc.type === 'Equity' && acc.name !== 'Prive') ||
        acc.name === 'Piutang Karyawan' ||
        acc.name === 'Piutang Usaha' ||
        acc.name === 'Kas Lebih/Kurang';
    } else {
      baseFilter = (acc: Account) => 
        acc.type === 'Expenses' || 
        acc.type === 'Assets' ||
        acc.name === 'Prive';
    }

    return CHART_OF_ACCOUNTS
      .filter(acc => 
          baseFilter(acc) && 
          !EXCLUDED_MANUAL_CATEGORIES.includes(acc.name)
      )
      .map(acc => acc.name);
  }, [watchedType]);

  // If the category is no longer valid for the selected type, reset it.
  useEffect(() => {
    if (watchedCategory && !filteredCategories.includes(watchedCategory) && transaction && transaction.type !== watchedType) {
        form.setValue("category", "");
    }
  }, [watchedType, watchedCategory, filteredCategories, form, transaction]);

  const isInventorySale = !!CHART_OF_ACCOUNTS.find(acc => acc.name === watchedCategory && acc.category === 'Sales Revenue');
  const isInventoryPurchase = watchedCategory === 'Persediaan Barang Dagang';
  const isInventoryAdjustment = ['Beban Barang Rusak/Hilang', 'Beban Sampel/Promosi'].includes(watchedCategory || '');
  const isInventoryTransaction = isInventorySale || isInventoryPurchase || isInventoryAdjustment;
  const isFixedAssetTransaction = ['Peralatan', 'Aset Tak Berwujud'].includes(watchedCategory || '');

  // Manage items array
  useEffect(() => {
    if (isInventoryTransaction && itemFields.length === 0) {
      appendItem({ itemId: "", quantity: 1 });
    } else if (!isInventoryTransaction && itemFields.length > 0) {
      // Clear items if category changes from inventory to non-inventory
      form.setValue("items", undefined);
    }
  }, [isInventoryTransaction, itemFields.length, appendItem, form]);

  const onSubmit: SubmitHandler<TransactionFormValues> = async (data) => {
    if (!transaction) return;
    try {
        await updateTransaction(transactionId, { ...data, date: format(data.date, 'yyyy-MM-dd'), accountId: transaction.accountId });
        toast({
            title: "Transaksi Diubah",
            description: "Detail transaksi berhasil diperbarui.",
        });
        router.push('/transactions');
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Gagal mengubah transaksi.",
        });
    }
  };

  if (!transaction) {
    return <div className="text-center p-8">Memuat transaksi...</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageHeader
        title="Ubah Transaksi"
        description="Edit detail transaksi Anda."
      />

      <Card>
        <CardHeader>
          <CardTitle>Entri Manual</CardTitle>
          <CardDescription>
            Perbarui detail transaksi Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipe Transaksi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih tipe" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="cash-in">Uang Masuk</SelectItem>
                            <SelectItem value="cash-out">Uang Keluar</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                  />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Transaksi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: id })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={id}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori Transaksi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea placeholder="cth., Penjualan Kemeja Polos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isFixedAssetTransaction && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="usefulLifeInMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Umur Ekonomis (Bulan)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="cth. 48" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salvageValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nilai Residu (Sisa)</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            placeholder="0"
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {isInventoryTransaction ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <FormLabel className="text-base">Daftar Produk yang Dijual/Dibeli</FormLabel>
                       <Button type="button" variant="outline" size="sm" onClick={() => appendItem({ itemId: "", quantity: 1 })}>
                         + Produk
                       </Button>
                    </div>
                    {itemFields.map((field, index) => (
                      <div key={field.id} className="flex gap-4 items-end">
                        <FormField
                          control={form.control}
                          name={`items.${index}.itemId` as any}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              {index === 0 && <FormLabel>Barang</FormLabel>}
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih barang dari inventaris" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {inventory.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                            control={form.control}
                            name={`items.${index}.quantity` as any}
                            render={({ field }) => (
                              <FormItem className="w-24">
                                {index === 0 && <FormLabel>Qty</FormLabel>}
                                <FormControl>
                                  <Input type="number" placeholder="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {index > 0 && (
                            <Button type="button" variant="ghost" size="icon" className="text-destructive mb-2" onClick={() => removeItem(index)}>
                               X
                            </Button>
                          )}
                      </div>
                    ))}
                    <div className="pt-2 border-t mt-4">
                       <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nominal Bersih Transaksi *</FormLabel>
                              <CardDescription>Masukkan total pendapatan/pengeluaran bersih dari gabungan produk di atas.</CardDescription>
                              <FormControl>
                                <CurrencyInput
                                  placeholder="0"
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                  </div>
                ) : (
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nominal</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder="100.000"
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex gap-4">
                <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/transactions')}>
                  Batal
                </Button>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
