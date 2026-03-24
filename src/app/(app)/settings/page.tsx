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
  name: z.string().min(3, "Company name must be at least 3 characters."),
  address: z.string().min(10, "Address is too short."),
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
            title: "Profile Updated",
            description: "Your company details have been saved.",
        });
    }

    function handleReset() {
        if (confirm("Are you sure you want to reset all data? This action cannot be undone.")) {
            resetData();
            toast({
                title: "Data Reset",
                description: "All application data has been reset to its initial state.",
            });
            form.reset({ name: "FinansiaPro Demo Store", address: "123 E-Commerce Ave, Online City, 12345" });
        }
    }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your company profile and application data."
      />
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Update your company's information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Company Name</FormLabel>
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
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                            <Input placeholder="123 Main St, Anytown, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div>
                  <FormLabel>Company Logo</FormLabel>
                   <div className="mt-2">
                       <Button asChild variant="outline">
                        <label>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Logo
                            <input type="file" className="sr-only" accept="image/*" />
                        </label>
                    </Button>
                   </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit">Save Changes</Button>
            </CardFooter>
            </form>
            </Form>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Import, export, or reset your application data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button variant="outline" className="w-full justify-start gap-2">
                    <FileUp className="h-4 w-4" /> Import from XLSX
               </Button>
               <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleReset}>
                    <Trash2 className="h-4 w-4" /> Reset All Data
               </Button>
            </CardContent>
        </Card>

      </div>

    </div>
  );
}
