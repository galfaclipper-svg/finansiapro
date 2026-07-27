"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Nama pemasok harus diisi"),
  contact: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

interface SupplierFormProps {
  defaultValues?: Partial<Supplier>;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isSubmitting?: boolean;
}

export function SupplierForm({ defaultValues, onSubmit, isSubmitting }: SupplierFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      contact: defaultValues?.contact || "",
      address: defaultValues?.address || "",
      notes: defaultValues?.notes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Pemasok *</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: PT. ABC / Toko Jaya" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kontak / No. HP</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: 081234567890" {...field} />
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
              <FormLabel>Alamat Pemasok</FormLabel>
              <FormControl>
                <Textarea placeholder="Alamat lengkap (opsional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catatan (Opsional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Informasi tambahan terkait pemasok ini..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Pemasok"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
