import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Phone, Mail, QrCode } from "lucide-react";
import Image from "next/image";

export default function DukunganPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Pusat Dukungan & Panduan</h1>
      <p className="text-muted-foreground">Selamat datang di pusat bantuan Finansia Pro. Di sini Anda dapat membaca panduan penggunaan sistem dan menghubungi pengembang.</p>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Buku Panduan Penggunaan Singkat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-base">1. Dashboard</h3>
            <p className="text-muted-foreground">Dashboard memberikan ringkasan keuangan secara langsung (real-time). Anda dapat melihat total saldo dari seluruh akun kas dan bank, serta grafik arus kas bulanan.</p>
          </div>
          <div>
            <h3 className="font-semibold text-base">2. Transaksi Umum</h3>
            <p className="text-muted-foreground">Menu ini digunakan untuk mencatat setiap pemasukan dan pengeluaran harian perusahaan. Pastikan memilih Kategori dan Akun Kas yang tepat agar laporan keuangan akurat.</p>
          </div>
          <div>
            <h3 className="font-semibold text-base">3. Piutang Karyawan (Kasbon)</h3>
            <p className="text-muted-foreground">Khusus untuk mencatat pinjaman karyawan (kasbon) dan pembayarannya (misal: potong gaji). Sistem otomatis melacak sisa hutang per karyawan.</p>
          </div>
          <div>
            <h3 className="font-semibold text-base">4. Laporan Keuangan</h3>
            <p className="text-muted-foreground">Anda dapat mengunduh (download) dan membagikan laporan Laba Rugi, Arus Kas, dan Neraca dalam bentuk gambar (PNG) maupun disalin teksnya.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Kontak Pengembang & Donasi
          </CardTitle>
          <CardDescription>
            Jika Anda mengalami kendala teknis atau ingin memberikan dukungan untuk pengembangan sistem ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>WhatsApp / Telepon: <strong>+6288-1010-12-9990</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>Email: <strong>wisesaniskala@gmail.com</strong></span>
            </div>
          </div>

          <div className="border-t pt-6 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Dukungan / Donasi via QRIS</h3>
            </div>
            <div className="text-center bg-white p-4 rounded-xl border max-w-sm mx-auto">
              {/* Note: using standard img tag here to avoid Next.js Image optimization configuration issues with local/external domains if not set up */}
              <img 
                src="/qris.jpg" 
                alt="QRIS Wisesa Niskala" 
                className="w-full h-auto object-contain mx-auto" 
              />
              <p className="mt-4 text-sm font-medium text-slate-800">Satu QRIS untuk Semua</p>
              <p className="text-xs text-slate-500">Scan QRIS di atas menggunakan aplikasi mobile banking, DANA, GoPay, OVO, ShopeePay, dll.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
