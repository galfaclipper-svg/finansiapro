import { PageHeader } from "@/components/layout/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default function NewInvoicePage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Buat Tagihan Baru"
        description="Isi detail di bawah ini untuk membuat tagihan baru untuk pelanggan Anda."
      />
      <InvoiceForm />
    </div>
  );
}
