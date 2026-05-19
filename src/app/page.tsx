import Link from 'next/link';
import { ArrowRight, BarChart3, ScanLine, FileSpreadsheet, Calculator, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] mix-blend-screen"></div>
      </div>

      <header className="px-6 lg:px-12 h-20 flex items-center bg-slate-950/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center justify-center gap-3">
          <Logo className="h-8 w-8 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <span className="font-extrabold text-xl tracking-tight text-white">FinansiaPro</span>
        </div>
        <nav className="ml-auto flex items-center gap-6">
          <Link href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
            Fitur
          </Link>
          <Link href="#keunggulan" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
            Keunggulan
          </Link>
          <Link href="/login" className="text-sm font-bold text-white hover:text-blue-400 transition-colors">
            Masuk
          </Link>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] rounded-full px-6">
            <Link href="/register">
              Mulai Sekarang
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative w-full pt-20 pb-32 md:pt-32 md:pb-48 flex items-center justify-center min-h-[90vh]">
          <div className="absolute inset-0 z-[-1] opacity-30">
            <img src="/hero-bg.png" alt="Abstract Financial Dashboard" className="w-full h-full object-cover object-center mix-blend-screen" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950"></div>
          </div>
          
          <div className="container px-4 md:px-6 text-center">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300 mb-8 backdrop-blur-sm shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-fade-in-up">
              <Zap className="mr-2 h-4 w-4 text-blue-400" />
              Revolusi Finansial B2B & E-Commerce
            </div>
            <h1 className="max-w-4xl mx-auto text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mb-6 animate-fade-in-up" style={{animationDelay: "0.1s"}}>
              Lupakan Rekap Manual. <br className="hidden md:block"/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 drop-shadow-sm">
                 Otomatisasi Keuangan Anda.
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed animate-fade-in-up" style={{animationDelay: "0.2s"}}>
              Ubah tumpukan struk menjadi laporan Excel rapi dalam hitungan detik dengan AI. Pantau profit, hitung Titik Impas (BEP), dan buat tagihan profesional tanpa perlu menyewa akuntan mahal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{animationDelay: "0.3s"}}>
              <Button asChild size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.5)] rounded-full h-14 px-8 text-lg font-semibold transition-all hover:scale-105">
                <Link href="/register">
                  Coba FinansiaPro Sekarang
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-full h-14 px-8 text-lg backdrop-blur-md transition-all">
                <Link href="#features">
                  Pelajari Fitur
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Feature Highlights - Glassmorphism Cards */}
        <section id="features" className="w-full py-24 bg-slate-950/50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Fitur Cerdas Penyelamat Waktu</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">Dirancang khusus untuk menghapus rasa frustrasi Anda terhadap rumitnya pembukuan tradisional.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Card 1 */}
              <div className="relative group rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 hover:bg-white/[0.04] transition-all hover:-translate-y-2">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <ScanLine className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">AI Receipt Scanner</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Foto struk atau bukti transfer, dan biarkan AI kami yang menginput nominal, tanggal, serta kategorinya secara otomatis. Bebas dari kesalahan ketik (human error).
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="relative group rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 hover:bg-white/[0.04] transition-all hover:-translate-y-2">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <FileSpreadsheet className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">Auto-Export Excel</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Ucapkan selamat tinggal pada rumus Excel yang memusingkan. Sistem kami mencetak Laba Rugi, Neraca, dan Jurnal ke format `.xlsx` rapi dalam satu kali klik, siap cetak A4.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="relative group rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 hover:bg-white/[0.04] transition-all hover:-translate-y-2">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                    <Calculator className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">BEP & ROI Projection</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Tidak tahu kapan bisnis Anda balik modal? FinansiaPro mensimulasikan Titik Impas (Break-Even Point) dari data riil Anda, memberikan panduan matematis agar Anda tidak merugi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof / Security */}
        <section id="keunggulan" className="w-full py-20 border-t border-white/5">
           <div className="container px-4 md:px-6">
              <div className="flex flex-col md:flex-row items-center justify-between bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12 gap-8">
                 <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                      <ShieldCheck className="mr-2 h-4 w-4 text-emerald-400" />
                      Privasi Kelas Enterprise
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold">Data Finansial Anda Terenkripsi Aman.</h3>
                    <p className="text-slate-400 text-lg">
                      Kami tidak pernah membagikan data keuangan Anda kepada pihak ketiga. Infrastruktur cloud kami dilindungi oleh keamanan tingkat tinggi untuk menjamin kerahasiaan bisnis Anda.
                    </p>
                 </div>
                 <div className="flex-1 w-full flex justify-center md:justify-end">
                    <Button asChild size="lg" className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-200 rounded-full h-14 px-8 text-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      <Link href="/register">
                        Buat Akun Sekarang
                      </Link>
                    </Button>
                 </div>
              </div>
           </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/10 bg-slate-950 py-12">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-slate-500" />
            <span className="font-bold text-slate-500">FinansiaPro &copy; 2024</span>
          </div>
          <p className="text-sm text-slate-600 text-center md:text-left">
            Proprietary Software milik Wisesa Niskala. All rights reserved.
          </p>
          <div className="flex gap-4">
             <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">Kebijakan Privasi</Link>
             <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">Syarat & Ketentuan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
