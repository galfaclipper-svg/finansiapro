'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { InventoryItem } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const adjustmentSchema = z.object({
  actualStock: z.coerce.number().min(0, "Stok fisik tidak boleh kurang dari 0."),
  notes: z.string().optional(),
});

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentFormProps {
  onSubmit: (values: AdjustmentFormValues) => void;
  item: InventoryItem;
  isSubmitting?: boolean;
}

export function StockAdjustmentForm({ onSubmit, item, isSubmitting }: StockAdjustmentFormProps) {
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      actualStock: item.stock,
      notes: '',
    },
  });

  useEffect(() => {
    form.reset({
      actualStock: item.stock,
      notes: '',
    });
  }, [item, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-muted p-3 rounded-md space-y-1 mb-4">
            <p className="text-sm text-muted-foreground">Stok sistem saat ini untuk <strong>{item.name}</strong>:</p>
            <p className="text-2xl font-bold">{item.stock} Pcs</p>
        </div>

        <FormField
          control={form.control}
          name="actualStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stok Fisik Sebenarnya (Gudang)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormDescription>Masukkan jumlah riil yang ada di gudang saat ini.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Keterangan Opsional</FormLabel>
                <FormControl>
                    <Input placeholder="cth., Barang rusak karena bocor" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Memproses...' : 'Sesuaikan Stok'}
        </Button>
      </form>
    </Form>
  );
}
