import Link from 'next/link';
import { ArrowRight, BarChart, FileText, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Balancer from 'react-wrap-balancer';
import { SecretAdminGate } from '@/components/secret-admin-gate';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-center">
          <SecretAdminGate>
            <Logo className="h-8 w-8 text-primary" />
          </SecretAdminGate>
          <span className="sr-only">FinansiaPro</span>
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="#features"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Fitur
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Harga
          </Link>
          <Link
            href="#about"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Tentang
          </Link>
          <Link
            href="#contact"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Kontak
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-background">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary font-headline">
                    <Balancer>
                      Kecerdasan Finansial Tanpa Batas untuk Bisnis E-Commerce Modern
                    </Balancer>
                  </h1>
                  <p className="max-w-[600px] text-foreground/80 md:text-xl">
                    <Balancer>
                      FinansiaPro menghadirkan input transaksi cerdas, pelaporan otomatis, dan wawasan berbasis AI untuk mengakselerasi efisiensi keuangan bisnis online Anda ke tingkat selanjutnya.
                    </Balancer>
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="group">
                    <Link href="/dashboard">
                      Akses Dashboard
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="#features">
                      Pelajari Lebih Lanjut
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative hidden lg:block">
                 <div className="absolute inset-0 -m-4 rounded-full bg-primary/10 blur-3xl"></div>
                  <div className="relative w-full h-full flex items-center justify-center">
                    <SecretAdminGate>
                      <Logo className="w-64 h-64 text-primary" />
                    </SecretAdminGate>
                  </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                  Fitur Unggulan
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  Revolusi Alur Kerja Finansial Anda
                </h2>
                <p className="max-w-[900px] text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Dari pencatatan transaksi terotomatisasi hingga dasbor wawasan yang komprehensif, FinansiaPro membekali bisnis online Anda dengan teknologi canggih untuk terus berkembang.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16 mt-12">
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                    <BarChart className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold font-headline">Pelaporan Otomatis Cerdas</h3>
                <p className="text-sm text-foreground/80">
                  Hasilkan laporan keuangan esensial secara real-time dengan akurasi presisi tinggi, dari jurnal umum hingga neraca.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                    <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold font-headline">Pemindaian Berbasis AI</h3>
                <p className="text-sm text-foreground/80">
                  Pindai struk dan bukti transfer dengan teknologi pengenalan AI yang secara instan mengategorikan transaksi, meminimalisir input manual.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                    <Package className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold font-headline">Manajemen Inventaris Terintegrasi</h3>
                <p className="text-sm text-foreground/80">
                  Pantau pergerakan dan ketersediaan stok barang secara otomatis dan akurat pada setiap siklus penjualan dan pembelian.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                Paket Layanan
              </h2>
              <p className="max-w-[700px] text-foreground/80 md:text-xl/relaxed">
                Harga yang transparan dan fleksibel untuk bisnis yang dinamis. Mulai optimalkan infrastruktur keuangan Anda hari ini.
              </p>
            </div>
            {/* Add pricing table here if needed */}
          </div>
        </section>

        <section id="about" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
          <div className="container px-4 md:px-6">
             <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                Tentang FinansiaPro
              </h2>
              <p className="max-w-[700px] text-foreground/80 md:text-xl/relaxed">
                Dikembangkan khusus untuk mengeliminasi kompleksitas finansial para pengusaha e-commerce modern. Kami percaya akuntansi profesional yang mutakhir dapat diakses tanpa perlu keahlian khusus di bidang keuangan.
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="w-full py-12 md:py-24 lg:py-32 bg-background">
            <div className="container px-4 md:px-6 text-center">
                 <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline mb-4">
                    Hubungi Kami
                 </h2>
                 <p className="max-w-[700px] mx-auto text-foreground/80 md:text-xl/relaxed mb-8">
                    Memiliki pertanyaan? Tim dukungan eksklusif kami siap membantu Anda mengintegrasikan alur kerja finansial yang canggih ini ke dalam bisnis Anda.
                 </p>
                 <Button asChild size="lg">
                    <Link href="mailto:support@finansiapro.com">
                        Hubungi Dukungan
                    </Link>
                 </Button>
            </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-foreground/60">&copy; 2024 FinansiaPro. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="/" className="text-xs hover:underline underline-offset-4">
            Syarat dan Ketentuan
          </Link>
          <Link href="/" className="text-xs hover:underline underline-offset-4">
            Kebijakan Privasi
          </Link>
        </nav>
      </footer>
    </div>
  );
}
