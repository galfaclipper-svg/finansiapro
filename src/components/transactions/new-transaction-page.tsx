"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  scanAndCategorizeTransaction,
  type ScanAndCategorizeTransactionOutput,
} from "@/ai/flows/scan-and-categorize-transaction-flow";

import { useAppState } from "@/hooks/use-app-state";
import { COA_CATEGORIES } from "@/lib/constants";
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
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useRouter } from "next/navigation";

const transactionSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  amount: z.coerce.number().positive("Amount must be positive."),
  description: z.string().min(2, "Description is too short."),
  type: z.enum(["cash-in", "cash-out"]),
  category: z.string({ required_error: "Please select a category." }),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function NewTransactionPage() {
  const { addTransaction } = useAppState();
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
    },
  });

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
          coaCategories: COA_CATEGORIES,
        });
        form.reset({
          ...form.getValues(),
          date: new Date(result.date),
          amount: result.amount,
          description: result.description,
          category: result.suggestedCategory,
          type: result.amount >= 0 ? 'cash-in' : 'cash-out',
        });
        toast({
          title: "Scan Successful",
          description: "Transaction details have been pre-filled.",
        });
      } catch (error) {
        console.error("Scan failed:", error);
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: "Could not extract details from the image.",
        });
      } finally {
        setIsScanning(false);
      }
    };
  };

  const onSubmit: SubmitHandler<TransactionFormValues> = (data) => {
    addTransaction({ ...data, date: data.date.toISOString().split("T")[0], accountId: ''});
    toast({
      title: "Transaction Added",
      description: "Your transaction has been successfully recorded.",
    });
    router.push('/transactions');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Transaction"
        description="Add a new transaction manually or by scanning a receipt."
      />

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Scan Receipt
            </CardTitle>
            <CardDescription>
              Upload a proof of transfer to let AI fill the form for you.
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
                    <Image src={scanPreview} alt="Scan preview" fill style={{objectFit: 'contain'}} />
                ) : (
                    receiptPlaceholder && <Image src={receiptPlaceholder.imageUrl} alt="Receipt placeholder" data-ai-hint={receiptPlaceholder.imageHint} fill style={{objectFit: 'cover', opacity: 0.1}}/>
                )}
              <div className="text-center space-y-2 z-0">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click button below to upload
                </p>
              </div>
            </div>
            <Button asChild className="w-full" variant="outline">
              <label>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
                <input type="file" className="sr-only" onChange={handleScan} disabled={isScanning} accept="image/*"/>
              </label>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Entry</CardTitle>
            <CardDescription>
              Fill in the details of your transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Sale of Product X" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
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
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
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
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="cash-in">Cash-in</SelectItem>
                                <SelectItem value="cash-out">Cash-out</SelectItem>
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
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {COA_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                 </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Transaction
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
