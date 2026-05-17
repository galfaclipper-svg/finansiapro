"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Trash2, ArrowLeft } from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";

const invoiceItemSchema = z.object({
  description: z.string().min(1, { message: "Deskripsi wajib diisi" }),
  quantity: z.number().min(1, { message: "Kuantitas minimal 1" }),
  unitPrice: z.number().min(0, { message: "Harga satuan tidak boleh negatif" }),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, { message: "Pilih pelanggan" }),
  date: z.string().min(1, { message: "Tanggal wajib diisi" }),
  dueDate: z.string().min(1, { message: "Tanggal jatuh tempo wajib diisi" }),
  items: z.array(invoiceItemSchema).min(1, { message: "Minimal 1 item tagihan" }),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function InvoiceForm() {
  const { clients, addInvoice } = useAppState();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Default values
  const today = format(new Date(), 'yyyy-MM-dd');
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonth = format(nextMonthDate, 'yyyy-MM-dd');

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: "",
      date: today,
      dueDate: nextMonth,
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
      notes: "Terima kasih atas kerja sama Anda.",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  
  // Calculate subtotal and tax
  const subTotal = watchItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  // Default tax rate 0% for now
  const taxRate = 0;
  const taxAmount = subTotal * (taxRate / 100);
  const totalAmount = subTotal + taxAmount;

  const onSubmit = async (values: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      const timestamp = Date.now();
      const invoiceNumber = `INV-${timestamp}`;
      
      await addInvoice({
        number: invoiceNumber,
        clientId: values.clientId,
        date: values.date,
        dueDate: values.dueDate,
        items: values.items.map(item => ({
          ...item,
          total: item.quantity * item.unitPrice,
        })),
        subTotal,
        taxRate,
        taxAmount,
        totalAmount,
        status: "draft",
        notes: values.notes || "",
      });

      toast({
        title: "Tagihan Dibuat",
        description: `Tagihan ${invoiceNumber} berhasil disimpan.`,
      });
      
      router.push('/invoices');
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Terjadi Kesalahan",
        description: "Tidak dapat menyimpan tagihan.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Pelanggan *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih pelanggan..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} {client.email ? `(${client.email})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        {clients.length === 0 && (
                          <p className="text-sm text-amber-500 mt-2">
                            Anda belum memiliki data pelanggan. <Link href="/clients" className="underline font-medium">Tambah Pelanggan Baru</Link>.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Tagihan *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jatuh Tempo *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Rincian Item</h3>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start border p-4 rounded-md relative group">
                      <div className="flex-1 w-full">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Deskripsi Layanan/Barang</FormLabel>
                              <FormControl>
                                <Input placeholder="cth. Jasa Pembuatan Website" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-full md:w-24">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Qty</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Harga Satuan</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-full md:w-32 pt-1">
                        <FormLabel className="text-xs text-muted-foreground block mb-2 md:mb-3">Total</FormLabel>
                        <div className="font-medium">
                          {formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0))}
                        </div>
                      </div>
                      
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -right-2 -top-2 md:relative md:right-auto md:top-auto md:mt-6 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Item
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan Tambahan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Terima kasih atas bisnis Anda." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="w-full md:w-80 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Ringkasan Tagihan</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subTotal)}</span>
                </div>
                {/* Space for future tax inputs */}
                <div className="flex justify-between font-bold text-lg border-t pt-4 mt-2">
                  <span>Total Akhir</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>

                <div className="pt-6 space-y-3">
                  <Button type="submit" className="w-full" disabled={isSubmitting || clients.length === 0}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simpan Tagihan"}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <Link href="/invoices">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Batal
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
