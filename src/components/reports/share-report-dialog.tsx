'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAppState } from '@/hooks/use-app-state';
import { Send, AlertCircle, Copy, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ReportRecipient, Invoice } from '@/lib/types';

export type ShareReportType = 'financial' | 'invoice';

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ShareReportType;
  data: any; // financial data or invoice data
  onDownloadXLSX?: () => void;
  onDownloadPDF?: () => void;
}

export function ShareReportDialog({ open, onOpenChange, type, data, onDownloadXLSX, onDownloadPDF }: ShareReportDialogProps) {
  const { companyProfile } = useAppState();
  const recipients = companyProfile.reportRecipients || [];

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['laba-rugi', 'neraca', 'arus-kas', 'buku-besar']);
  const [autoDownload, setAutoDownload] = useState<'none' | 'pdf' | 'xlsx'>('xlsx');
  const [messagePreview, setMessagePreview] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto select first recipient if available
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipientId) {
      setSelectedRecipientId(recipients[0].id);
    }
  }, [recipients, selectedRecipientId]);

  const recipient = recipients.find(r => r.id === selectedRecipientId);

  // Update send method if recipient doesn't have the selected one
  useEffect(() => {
    if (recipient) {
      if (sendMethod === 'whatsapp' && !recipient.whatsapp && recipient.email) {
        setSendMethod('email');
      } else if (sendMethod === 'email' && !recipient.email && recipient.whatsapp) {
        setSendMethod('whatsapp');
      }
    }
  }, [recipient, sendMethod]);

  // Generate preview text
  useEffect(() => {
    let text = `Yth. ${recipient?.salutation ? recipient.salutation + ' ' : ''}${recipient?.name || 'Bapak/Ibu'},\n\n`;

    if (type === 'financial') {
      text += `Berikut adalah ringkasan Laporan Keuangan dari *${companyProfile.name}*:\n\n`;
      
      if (selectedOptions.includes('laba-rugi')) {
        text += `📊 *LABA RUGI*\n`;
        text += `- Total Pendapatan: ${formatCurrency(data?.labaRugi?.totalRevenue || 0)}\n`;
        text += `- Total Beban: ${formatCurrency(data?.labaRugi?.totalExpenses || 0)}\n`;
        text += `- Laba Bersih: ${formatCurrency(data?.labaRugi?.netIncome || 0)}\n\n`;
      }
      
      if (selectedOptions.includes('neraca')) {
        const totalLiabilities = Object.values(data?.neraca?.liabilities || {}).reduce((a: any, b: any) => a + b, 0) as number;
        const totalEquity = Object.values(data?.neraca?.equity || {}).reduce((a: any, b: any) => a + b, 0) as number;
        // Prive is a contra-equity account (subtraction), handled already in equity calculation.
        // Wait, the equity values in data.neraca.equity are raw values. I can just use totalLiabilitiesAndEquity - totalLiabilities
        const calculatedEquity = (data?.neraca?.totalLiabilitiesAndEquity || 0) - totalLiabilities;
        text += `⚖️ *NERACA (POSISI KEUANGAN)*\n`;
        text += `- Total Aset: ${formatCurrency(data?.neraca?.totalAssets || 0)}\n`;
        text += `- Total Kewajiban: ${formatCurrency(totalLiabilities || 0)}\n`;
        text += `- Total Ekuitas: ${formatCurrency(calculatedEquity || 0)}\n\n`;
      }

      if (selectedOptions.includes('arus-kas')) {
        text += `💵 *ARUS KAS*\n`;
        text += `- Kas Awal: ${formatCurrency(data?.arusKas?.beginningCash || 0)}\n`;
        text += `- Arus Kas Bersih: ${formatCurrency(data?.arusKas?.netCashFlow || 0)}\n`;
        text += `- Saldo Kas Akhir: ${formatCurrency(data?.arusKas?.endingCash || 0)}\n\n`;
      }

      if (selectedOptions.includes('buku-besar')) {
        text += `📔 *BUKU BESAR & JURNAL UMUM*\n`;
        text += `- Daftar rincian seluruh riwayat transaksi (General Ledger & Journal) tersedia di dokumen lampiran.\n\n`;
      }
      
      if (selectedOptions.includes('audit-investor')) {
        text += `📑 *KEBUTUHAN AUDIT & INVESTOR*\n`;
        text += `- Dokumen pendukung komprehensif untuk peninjauan khusus telah dilampirkan.\n\n`;
      }
    } else if (type === 'invoice') {
      const inv = data as Invoice;
      text += `Berikut adalah informasi Tagihan/Invoice dari *${companyProfile.name}*:\n\n`;
      text += `🧾 *INVOICE #${inv?.invoiceNumber}*\n`;
      text += `- Klien: ${inv?.clientName}\n`;
      text += `- Tanggal: ${inv?.issueDate}\n`;
      text += `- Jatuh Tempo: ${inv?.dueDate}\n`;
      text += `- Status: ${inv?.status.toUpperCase()}\n`;
      text += `- Total Tagihan: ${formatCurrency(inv?.total || 0)}\n\n`;
    }

    text += `Catatan: Mohon pastikan untuk memeriksa dokumen lampiran (PDF/Excel) untuk rincian lengkapnya.\n\nTerima kasih.`;
    setMessagePreview(text);
  }, [type, data, selectedOptions, recipient, companyProfile.name]);

  const toggleOption = (opt: string) => {
    setSelectedOptions(prev => 
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const handleSend = () => {
    if (!recipient) return;
    
    if (sendMethod === 'whatsapp' && recipient.whatsapp) {
      // Clean phone number (remove +, spaces, leading 0 to 62)
      let phone = recipient.whatsapp.replace(/\D/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(messagePreview)}`;
      window.open(url, '_blank');
    } else if (sendMethod === 'email' && recipient.email) {
      const subject = type === 'financial' ? `Laporan Keuangan - ${companyProfile.name}` : `Invoice ${data?.invoiceNumber} - ${companyProfile.name}`;
      const url = `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messagePreview)}`;
      window.location.href = url;
    }

    if (autoDownload === 'pdf' && onDownloadPDF) {
      setTimeout(() => onDownloadPDF(), 500);
    } else if (autoDownload === 'xlsx' && onDownloadXLSX) {
      setTimeout(() => onDownloadXLSX(), 500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messagePreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kirim Laporan</DialogTitle>
          <DialogDescription>
            Pilih penerima dan media pengiriman.
          </DialogDescription>
        </DialogHeader>

        {recipients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/30 rounded-lg border border-dashed">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">Belum Ada Penerima</p>
            <p className="text-xs text-muted-foreground">
              Silakan tambahkan kontak Stakeholder di halaman Pengaturan terlebih dahulu.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Pilih Penerima</Label>
              <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih penerima..." />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Media Pengiriman</Label>
              <RadioGroup value={sendMethod} onValueChange={(v) => setSendMethod(v as any)} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="whatsapp" id="r-wa" disabled={!recipient?.whatsapp} />
                  <Label htmlFor="r-wa" className={!recipient?.whatsapp ? 'text-muted-foreground' : ''}>
                    WhatsApp {recipient?.whatsapp ? `(${recipient.whatsapp})` : '(Tidak tersedia)'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="r-email" disabled={!recipient?.email} />
                  <Label htmlFor="r-email" className={!recipient?.email ? 'text-muted-foreground' : ''}>
                    Email {recipient?.email ? `(${recipient.email})` : '(Tidak tersedia)'}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {type === 'financial' && (
              <div className="space-y-3">
                <Label>Data yang Disisipkan</Label>
                <div className="grid grid-cols-2 gap-2 border p-3 rounded-md bg-muted/10">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="opt-laba" 
                      checked={selectedOptions.includes('laba-rugi')}
                      onCheckedChange={() => toggleOption('laba-rugi')}
                    />
                    <Label htmlFor="opt-laba" className="text-sm cursor-pointer">Laba Rugi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="opt-neraca" 
                      checked={selectedOptions.includes('neraca')}
                      onCheckedChange={() => toggleOption('neraca')}
                    />
                    <Label htmlFor="opt-neraca" className="text-sm cursor-pointer">Neraca</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="opt-kas" 
                      checked={selectedOptions.includes('arus-kas')}
                      onCheckedChange={() => toggleOption('arus-kas')}
                    />
                    <Label htmlFor="opt-kas" className="text-sm cursor-pointer">Arus Kas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="opt-bukubesar" 
                      checked={selectedOptions.includes('buku-besar')}
                      onCheckedChange={() => toggleOption('buku-besar')}
                    />
                    <Label htmlFor="opt-bukubesar" className="text-sm cursor-pointer">Buku Besar</Label>
                  </div>
                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox 
                      id="opt-audit" 
                      checked={selectedOptions.includes('audit-investor')}
                      onCheckedChange={() => toggleOption('audit-investor')}
                    />
                    <Label htmlFor="opt-audit" className="text-sm cursor-pointer">Kebutuhan Audit & Investor</Label>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Otomatis Unduh Lampiran</Label>
              <RadioGroup value={autoDownload} onValueChange={(v) => setAutoDownload(v as any)} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="xlsx" id="dl-xlsx" />
                  <Label htmlFor="dl-xlsx" className="cursor-pointer">Excel (XLSX)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="dl-pdf" disabled={!onDownloadPDF} />
                  <Label htmlFor="dl-pdf" className={`cursor-pointer ${!onDownloadPDF ? 'text-muted-foreground' : ''}`}>PDF (Print)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="dl-none" />
                  <Label htmlFor="dl-none" className="cursor-pointer">Jangan Unduh</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Pratinjau Pesan</Label>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
                  {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? 'Tersalin' : 'Salin Teks'}
                </Button>
              </div>
              <Textarea 
                value={messagePreview} 
                onChange={(e) => setMessagePreview(e.target.value)}
                className="min-h-[200px] text-sm resize-y font-mono bg-muted/30"
              />
              <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Sistem tidak dapat melampirkan file otomatis ke dalam pesan. {autoDownload !== 'none' ? 'File akan otomatis terunduh bersamaan dengan terbukanya jendela pesan, Anda tinggal menarik file tersebut ke dalam kolom percakapan.' : 'Silakan pastikan Anda sudah mengunduh file laporan sebelumnya.'}
                </span>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button 
            disabled={recipients.length === 0 || !recipient || (!recipient.whatsapp && !recipient.email)} 
            onClick={handleSend}
            className="gap-2"
          >
            <Send className="w-4 h-4" /> Buka & Kirim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
