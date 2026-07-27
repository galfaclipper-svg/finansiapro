"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, PlusCircle } from "lucide-react";
import type { Employee, SalaryComponent } from "@/lib/types";

const salaryComponentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama komponen wajib diisi"),
  amount: z.coerce.number().min(0, "Nominal tidak boleh negatif"),
  type: z.enum(["allowance", "deduction"]),
});

const formSchema = z.object({
  name: z.string().min(1, "Nama karyawan harus diisi"),
  position: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  basicSalary: z.coerce.number().min(0, "Gaji tidak boleh negatif").optional(),
  salaryComponents: z.array(salaryComponentSchema).optional(),
});

interface EmployeeFormProps {
  defaultValues?: Partial<Employee>;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isSubmitting?: boolean;
}

export function EmployeeForm({ defaultValues, onSubmit, isSubmitting }: EmployeeFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      position: defaultValues?.position || "",
      phone: defaultValues?.phone || "",
      notes: defaultValues?.notes || "",
      isActive: defaultValues?.isActive ?? true,
      basicSalary: defaultValues?.basicSalary || 0,
      salaryComponents: defaultValues?.salaryComponents || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "salaryComponents",
  });

  const addComponent = () => {
    append({ id: `COMP-${Date.now()}`, name: "", amount: 0, type: "allowance" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Profil Karyawan</h3>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama karyawan..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jabatan</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Staff Gudang" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor HP</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: 0812..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Status Aktif</FormLabel>
                    <div className="text-xs text-muted-foreground">Karyawan masih bekerja</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
                    <Textarea placeholder="Catatan tambahan..." {...field} className="resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-semibold border-b pb-2">Komponen Gaji</h3>
             <FormField
                control={form.control}
                name="basicSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gaji Pokok (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Tunjangan & Potongan</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addComponent} className="h-7 px-2 text-xs">
                    <PlusCircle className="w-3 h-3 mr-1" /> Tambah
                  </Button>
                </div>
                
                {fields.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center p-4 border rounded-md border-dashed bg-muted/30">
                    Belum ada tunjangan/potongan khusus.
                  </div>
                ) : (
                  fields.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2 bg-muted/20 p-2 rounded-md border">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <FormField
                          control={form.control}
                          name={`salaryComponents.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Input placeholder="Nama (Misal: THR)" className="h-8 text-xs" {...field} />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`salaryComponents.${index}.amount`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Input type="number" placeholder="Rp" className="h-8 text-xs" {...field} />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <FormField
                            control={form.control}
                            name={`salaryComponents.${index}.type`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-xs w-[100px]">
                                      <SelectValue placeholder="Tipe" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="allowance">Tunjangan</SelectItem>
                                    <SelectItem value="deduction">Potongan</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px]" />
                              </FormItem>
                            )}
                          />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Data Karyawan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
