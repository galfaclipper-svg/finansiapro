"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/hooks/use-app-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react";
import Link from "next/link";
import { exportInvoiceToExcel } from "@/lib/invoice-exporter";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, Client } from "@/lib/types";

export default function InvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const { invoices, clients, companyProfile } = useAppState();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (invoiceId && invoices.length > 0) {
      const foundInvoice = invoices.find(inv => inv.id === invoiceId);
      if (foundInvoice) {
        setInvoice(foundInvoice);
        const foundClient = clients.find(c => c.id === foundInvoice.clientId);
        if (foundClient) {
          setClient(foundClient);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Tagihan tidak ditemukan",
          description: "Tagihan yang Anda cari mungkin sudah dihapus.",
        });
        router.push("/invoices");
      }
    }
  }, [invoiceId, invoices, clients, router, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = async () => {
    if (!invoice || !client) return;
    
    setIsGenerating(true);
    try {
      await exportInvoiceToExcel(invoice, client, companyProfile);
      
      toast({
        title: "Excel Berhasil Diunduh",
        description: `File Invoice_${invoice.number}.xlsx telah tersimpan.`,
      });
    } catch (error) {
      console.error("Error generating Excel", error);
      toast({
        variant: "destructive",
        title: "Gagal Membuat Excel",
        description: "Terjadi kesalahan saat mengekspor dokumen ke Excel.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!invoice || !client) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Button variant="outline" asChild>
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Cetak (Print)
          </Button>
          <Button onClick={handleDownloadExcel} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Unduh Excel (XLSX)
          </Button>
        </div>
      </div>

      <div id="print-area" className="relative bg-white text-black p-8 sm:p-12 min-h-[297mm] shadow-lg print:shadow-none print:m-0 print:p-0 overflow-hidden" ref={printRef}>
        {/* Paid Stamp */}
        {invoice.status === "paid" && (
          <div className="absolute top-64 left-1/2 -translate-x-1/2 -rotate-12 opacity-20 pointer-events-none z-10 flex flex-col items-center justify-center">
            <div className="border-[12px] border-green-600 text-green-600 text-8xl md:text-9xl font-black uppercase px-12 py-6 tracking-widest rounded-3xl">
              LUNAS
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start border-b pb-8 mb-8 relative z-20">
          <div>
            {companyProfile.logoUrl ? (
              <img src={companyProfile.logoUrl} alt={companyProfile.name} className="h-16 object-contain mb-4" />
            ) : (
              <h1 className="text-2xl font-bold text-primary mb-4">{companyProfile.name}</h1>
            )}
            <div className="text-sm text-gray-500">
              <p>{companyProfile.address || "Alamat Perusahaan"}</p>
              <p>{companyProfile.phone || "No. Telepon"}</p>
              <p>{companyProfile.email || "Email"}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-200 mb-2">INVOICE</h2>
            <p className="text-sm font-medium text-gray-700">No: {invoice.number}</p>
            <p className="text-sm text-gray-500">Tanggal: {formatDate(invoice.date)}</p>
            <p className="text-sm text-gray-500">Jatuh Tempo: {formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Billed To */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Ditagihkan Kepada:</h3>
          <div className="text-sm">
            <p className="font-bold text-base text-gray-800">{client.name}</p>
            {client.address && <p className="text-gray-600 mt-1 whitespace-pre-line">{client.address}</p>}
            {client.email && <p className="text-gray-600 mt-1">{client.email}</p>}
            {client.phone && <p className="text-gray-600 mt-1">{client.phone}</p>}
          </div>
        </div>

        {/* Table */}
        <div className="mb-8">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="py-3 px-4 rounded-tl-md">Deskripsi</th>
                <th className="py-3 px-4 text-right">Kuantitas</th>
                <th className="py-3 px-4 text-right">Harga Satuan</th>
                <th className="py-3 px-4 text-right rounded-tr-md">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-4 px-4">{item.description}</td>
                  <td className="py-4 px-4 text-right">{item.quantity}</td>
                  <td className="py-4 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-4 px-4 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-full sm:w-1/2 md:w-1/3">
            <div className="flex justify-between py-2 text-sm text-gray-600 border-b">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subTotal)}</span>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between py-2 text-sm text-gray-600 border-b">
                <span>Pajak ({invoice.taxRate}%)</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-4 text-lg font-bold text-gray-800">
              <span>Total Tagihan</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-8 border-t">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Catatan:</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Print styles injected directly to hide non-print elements properly and format page */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page { size: auto;  margin: 0mm; }
        }
      `}} />
    </div>
  );
}
