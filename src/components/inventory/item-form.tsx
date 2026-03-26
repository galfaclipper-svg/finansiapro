'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { InventoryItem } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '../ui/currency-input';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const itemSchema = z.object({
  name: z.string().min(2, "Nama barang minimal 2 karakter."),
  sku: z.string().min(1, "SKU harus diisi."),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif."),
  costPerUnit: z.coerce.number().min(0, "Biaya harus angka positif."),
  salePrice: z.coerce.number().min(0, "Harga jual harus angka positif."),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  onSubmit: (values: ItemFormValues) => void;
  initialData?: InventoryItem | null;
  isSubmitting?: boolean;
}

export function ItemForm({ onSubmit, initialData, isSubmitting }: ItemFormProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: initialData || {
      name: '',
      sku: '',
      stock: 0,
      costPerUnit: 0,
      salePrice: 0,
    },
  });
  
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
       form.reset({
          name: '',
          sku: '',
          stock: 0,
          costPerUnit: 0,
          salePrice: 0,
        });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Barang</FormLabel>
              <FormControl>
                <Input placeholder="cth., Kemeja Lengan Panjang" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
                <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                    <Input placeholder="cth., KMJ-LGN-01" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Stok</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="costPerUnit"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Biaya Per Unit</FormLabel>
                    <FormControl>
                        <CurrencyInput
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
                name="salePrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Harga Jual</FormLabel>
                    <FormControl>
                        <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Tambah Barang')}
        </Button>
      </form>
    </Form>
  );
}
