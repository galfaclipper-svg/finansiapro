
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  scanAndCategorizeTransaction,
} from "@/ai/flows/scan-and-categorize-transaction-flow";

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
  Upload,
  CalendarIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useRouter } from "next/navigation";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Account } from "@/lib/types";

const transactionSchema = z.object({
  date: z.date({
    required_error: "Tanggal harus diisi.",
  }),
  amount: z.coerce.number().positive("Jumlah harus positif."),
  description: z.string().min(2, "Deskripsi terlalu pendek."),
  type: z.enum(["cash-in", "cash-out"], { required_error: "Tipe harus diisi." }),
  category: z.string({ required_error: "Silakan pilih kategori." }),
  itemId: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

// These are accounts that are typically handled by automated/period-end journal entries,
// not manual cash transactions. Hiding them prevents confusion and data entry errors.
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

export default function NewTransactionPage() {
  const { addTransaction, inventory } = useAppState();
  const { toast } = useToast();
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  
  const receiptPlaceholder = PlaceHolderImages.find(p => p.id === 'receipt-scan-placeholder');

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      type: "cash-out",
      quantity: undefined,
      unitPrice: undefined,
      amount: undefined,
    },
  });

  const watchedType = form.watch("type");
  const watchedCategory = form.watch("category");
  const watchedItemId = form.watch("itemId");
  const watchedQuantity = form.watch("quantity");
  const watchedUnitPrice = form.watch("unitPrice");

  // Reset category when transaction type changes
  useEffect(() => {
      form.resetField("category");
  }, [watchedType, form]);

  const filteredCategories = useMemo(() => {
    let baseFilter;

    if (watchedType === 'cash-in') {
      // Cash-in can be from Revenue, Equity injection, or collecting receivables
      baseFilter = (acc: Account) => 
        acc.type === 'Revenue' || 
        (acc.type === 'Equity' && acc.name !== 'Prive') || // Prive is a cash-out
        acc.name === 'Piutang Karyawan' || // Getting cash back from employee
        acc.name === 'Piutang Usaha' || // Getting cash back from customer
        acc.name === 'Kas Lebih/Kurang'; // To record cash overage
    } else { // 'cash-out'
      // Cash-out can be for Expenses, buying Assets, or owner drawings (Prive)
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

  const isInventorySale = !!watchedCategory?.startsWith('Pendapatan Penjualan');
  const isInventoryPurchase = watchedCategory === 'Persediaan Barang Dagang';
  const isInventoryTransaction = isInventorySale || isInventoryPurchase;

  // Auto-calculate total amount for inventory transactions
  useEffect(() => {
    if (isInventoryTransaction) {
      const qty = watchedQuantity || 0;
      const price = watchedUnitPrice || 0;
      form.setValue("amount", qty * price, { shouldValidate: true });
    }
  }, [watchedQuantity, watchedUnitPrice, isInventoryTransaction, form]);

  // Auto-fill unit price when an inventory item is selected
  useEffect(() => {
    if (isInventoryTransaction && watchedItemId) {
      const selectedItem = inventory.find(item => item.id === watchedItemId);
      if (selectedItem) {
        const price = isInventorySale ? selectedItem.salePrice : selectedItem.costPerUnit;
        form.setValue('unitPrice', price);
      }
    }
  }, [watchedItemId, isInventorySale, isInventoryTransaction, inventory, form]);


  const handleScan: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const imageDataUri = reader.result as string;
      setScanPreview(imageDataUri);
      try {
        const result = await scanAndCategorizeTransaction({
          imageDataUri,
          coaCategories: CHART_OF_ACCOUNTS.map(acc => acc.name),
        });
        
        form.reset({
          ...form.getValues(),
          date: new Date(result.date),
          amount: result.amount,
          description: result.description,
          category: result.suggestedCategory,
          type: result.type,
        });
        toast({
          title: "Pindai Berhasil",
          description: "Detail transaksi telah diisi sebelumnya.",
        });
      } catch (error) {
        console.error("Scan failed:", error);
        toast({
          variant: "destructive",
          title: "Pindai Gagal",
          description: "Tidak dapat mengekstrak detail dari gambar.",
        });
      } finally {
        setIsScanning(false);
      }
    };
  };

  const onSubmit: SubmitHandler<TransactionFormValues> = (data) => {
    addTransaction({ ...data, date: data.date.toISOString().split("T")[0], accountId: ''});
    toast({
      title: "Transaksi Ditambahkan",
      description: "Transaksi Anda telah berhasil dicatat.",
    });
    router.push('/transactions');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Transaksi Baru"
        description="Tambahkan transaksi baru secara manual atau dengan memindai struk."
      />

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Pindai Struk
            </CardTitle>
            <CardDescription>
              Unggah bukti transfer untuk diisi otomatis oleh AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden">
                {isScanning && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {scanPreview ? (
                    <Image src={scanPreview} alt="Pratinjau Pindai" fill style={{objectFit: 'contain'}} />
                ) : (
                    receiptPlaceholder && <Image src={receiptPlaceholder.imageUrl} alt="Placeholder struk" data-ai-hint={receiptPlaceholder.imageHint} fill style={{objectFit: 'cover', opacity: 0.1}}/>
                )}
              <div className="text-center space-y-2 z-0">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Klik tombol di bawah untuk mengunggah
                </p>
              </div>
            </div>
            <Button asChild className="w-full" variant="outline">
              <label>
                <Upload className="mr-2 h-4 w-4" />
                Unggah Gambar
                <input type="file" className="sr-only" onChange={handleScan} disabled={isScanning} accept="image/*"/>
              </label>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entri Manual</CardTitle>
            <CardDescription>
              Isi detail transaksi Anda.
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                
                {isInventoryTransaction ? (
                  <>
                    <FormField
                      control={form.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barang</FormLabel>
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
                    <div className="grid grid-cols-3 gap-4">
                       <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kuantitas</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="unitPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Harga Satuan</FormLabel>
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
                         <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jumlah Total</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  placeholder="0"
                                  disabled
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                  </>
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
                
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tambah Transaksi
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
