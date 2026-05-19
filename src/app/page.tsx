import Link from 'next/link';
import { ArrowRight, BarChart3, ScanLine, FileSpreadsheet, Calculator, ShieldCheck, Zap, AlertOctagon, CheckCircle2, Star, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  return (
    {/* Added overflow-x-hidden here to prevent horizontal scroll issues */}
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden font-sans w-full relative">
      {/* Background Decor - ensuring they don't break viewport width */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/20 rounded-full blur-[100px] md:blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-indigo-600/10 rounded-full blur-[120px] md:blur-[150px] mix-blend-screen"></div>
      </div>

      <header className="px-4 lg:px-12 h-20 flex items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5 w-full max-w-[100vw]">
        <div className="flex items-center justify-center gap-3">
          <Logo className="h-8 w-8 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <span className="font-extrabold text-xl tracking-tight text-white">FinansiaPro</span>
        </div>
        <nav className="ml-auto flex items-center gap-4 md:gap-6">
          <Link href="#masalah" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block">
            Masalah
          </Link>
          <Link href="#fitur" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block">
            Solusi
          </Link>
          <Link href="#ulasan" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block">
            Ulasan
          </Link>
          <Link href="/login" className="text-sm font-bold text-white hover:text-blue-400 transition-colors">
            Masuk
          </Link>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] rounded-full px-4 md:px-6">
            <Link href="/register">
              Mulai Sekarang
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1 relative z-10 w-full overflow-hidden">
        {/* Hero Section */}
        <section className="relative w-full pt-20 pb-32 md:pt-32 md:pb-48 flex items-center justify-center min-h-[90vh]">
          <div className="absolute inset-0 z-[-1] opacity-30">
            <img src="/hero-bg.png" alt="Abstract Financial Dashboard" className="w-full h-full object-cover object-center mix-blend-screen" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950"></div>
          </div>
          
          <div className="container px-4 md:px-6 text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300 mb-8 backdrop-blur-sm shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-fade-in-up">
              <Zap className="mr-2 h-4 w-4 text-blue-400" />
              Solusi Pembukuan #1 untuk Bisnis Modern
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mb-6 animate-fade-in-up" style={{animationDelay: "0.1s"}}>
              Stop Buang Waktu Anda. <br className="hidden md:block"/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 drop-shadow-sm">
                 Otomatisasi Laporan Keuangan Anda.
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-400 mb-10 leading-relaxed animate-fade-in-up" style={{animationDelay: "0.2s"}}>
              Dari pencatatan harian hingga laporan Excel terintegrasi rumus dan Invoice siap cetak. Dapatkan kendali penuh atas profit dan arah bisnis Anda tanpa harus menjadi ahli akuntansi.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{animationDelay: "0.3s"}}>
              <Button asChild size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.5)] rounded-full h-14 px-8 text-lg font-semibold transition-all hover:scale-105">
                <Link href="/register">
                  Dapatkan Kode Akses Anda
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Agitation / Pain Points Section */}
        <section id="masalah" className="w-full py-24 bg-slate-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-6">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">Apakah Anda Sering Merasakan Ini?</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">Jangan biarkan bisnis Anda hancur hanya karena administrasi yang kacau.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                <h3 className="text-xl font-bold text-slate-200 mb-3">Lelah Lembur Buat Laporan</h3>
                <p className="text-slate-400">Siang hari sibuk melayani pembeli, malam hari mata lelah menyocokkan nota satu per satu sampai larut. Waktu bersama keluarga habis.</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                <h3 className="text-xl font-bold text-slate-200 mb-3">Kas Bocor, Uang Entah Kemana</h3>
                <p className="text-slate-400">Barang laris manis, omzet terlihat besar. Tapi saat dicek, kas kosong. Anda tidak tahu apakah Anda sedang untung atau malah rugi.</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                <h3 className="text-xl font-bold text-slate-200 mb-3">Pusing Rumus Excel & Desain Nota</h3>
                <p className="text-slate-400">Mencoba merapikan data di Excel tapi rumus sering error (N/A). Bikin invoice ke klien pun berantakan, kelihatan tidak profesional.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution / Features Section */}
        <section id="fitur" className="w-full py-24 bg-slate-950/50 relative">
          {/* Decorative element */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Solusi Menyeluruh di Tangan Anda</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">FinansiaPro didesain untuk otomatisasi maksimal. Tinggalkan cara lama Anda hari ini.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Feature 1 */}
              <div className="relative group rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 hover:bg-white/[0.05] transition-all hover:-translate-y-1">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Excel Super Cerdas</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Dapatkan file Excel (.xlsx) yang <strong>sudah mencakup rumus terintegrasi antar sheet</strong>. Mulai dari Jurnal, Buku Besar, hingga Laba Rugi otomatis terkait tanpa Anda harus mengetik manual.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="relative group rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 hover:bg-white/[0.05] transition-all hover:-translate-y-1">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400">
                  <Printer className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Invoice PDF Siap Cetak</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Buat tagihan profesional dan klik Export. File <strong>PDF akan langsung keluar dalam format siap print (Kertas A4)</strong> tanpa perlu diedit, lengkap dengan Kop Surat/Logo Anda.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="relative group rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 hover:bg-white/[0.05] transition-all hover:-translate-y-1">
                <div className="h-14 w-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400">
                  <Calculator className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Simulasi BEP / Titik Impas</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Pastikan Anda tidak 'Bakar Uang'. Masukkan estimasi biaya Anda, dan sistem akan menghitung berapa minimum penjualan agar Anda tidak rugi.
                </p>
              </div>
              
              {/* Feature 4 */}
              <div className="relative group rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 hover:bg-white/[0.05] transition-all hover:-translate-y-1 lg:col-span-3">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1">
                    <div className="h-14 w-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-6 text-orange-400">
                      <BarChart3 className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">Sinkronisasi Penuh (Stok & Kas)</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Satu kali Anda mencatat faktur (Invoice), barang di gudang (Inventaris) akan otomatis berkurang, dan arus kas akan ter-*update*. Tidak perlu melakukan input data ganda! 
                      Ditambah dengan <i>AI Scanner</i> opsional kami untuk mengekstrak data dari struk belanja dengan cepat.
                    </p>
                  </div>
                  <div className="flex-1 w-full bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-2xl pointer-events-none"></div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-xl">
                        <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" />
                        <span className="text-sm text-slate-300">Stok Barang "Kaos Polos" otomatis berkurang -20.</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-xl">
                        <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" />
                        <span className="text-sm text-slate-300">Pendapatan Penjualan Rp2.000.000 tercatat di Jurnal.</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-xl">
                        <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" />
                        <span className="text-sm text-slate-300">Laporan Laba Rugi otomatis diperbarui secara Real-time.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Social Proof / Testimonials */}
        <section id="ulasan" className="w-full py-24 bg-slate-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Dipercaya oleh Pengusaha Cerdas</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">Mereka telah beralih dari pusingnya rekap manual ke sistem serba otomatis.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl relative">
                <div className="flex gap-1 mb-4">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-slate-300 italic mb-6">"Dulu saya butuh 3 hari di akhir bulan hanya untuk merekap nota dan mencocokkan stok dengan uang di laci. Sejak pakai FinansiaPro, klik 'Export', Excel-nya langsung jadi beserta semua rumusnya. Gila, sangat menghemat waktu!"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">D</div>
                  <div>
                    <h4 className="font-bold text-white">Dian A.</h4>
                    <p className="text-sm text-slate-500">Pemilik Toko Retail Pakaian</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl relative">
                <div className="flex gap-1 mb-4">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-slate-300 italic mb-6">"Invoice PDF-nya luar biasa! Tinggal masukkan nama pelanggan, isi barang, klik, lalu langsung kirim ke WhatsApp klien. Format cetaknya pas banget ukuran A4, kelihatan sangat profesional. Klien saya sampai memuji."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl">B</div>
                  <div>
                    <h4 className="font-bold text-white">Budi Santoso</h4>
                    <p className="text-sm text-slate-500">Agency Jasa Digital</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full py-20 border-t border-blue-500/20 bg-blue-900/10 relative overflow-hidden">
           <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full transform scale-150"></div>
           <div className="container px-4 md:px-6 relative z-10 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">Berhenti Menunda Kesuksesan Bisnis Anda.</h2>
              <p className="text-slate-300 text-lg md:text-xl mb-10">
                Waktu Anda terlalu berharga untuk dihabiskan mengurus rumus dan rekapitulasi. Klaim akses Anda hari ini dan biarkan sistem kami yang bekerja untuk Anda.
              </p>
              <Button asChild size="lg" className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.6)] rounded-full h-16 px-10 text-xl font-bold transition-transform hover:scale-105">
                <Link href="/register">
                  Dapatkan Akses Eksklusif Sekarang
                </Link>
              </Button>
              <p className="mt-4 text-sm text-slate-500">*Akses dilindungi oleh Kode Lisensi eksklusif.</p>
           </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/10 bg-slate-950 py-12">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6 mx-auto">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-slate-500" />
            <span className="font-bold text-slate-500">FinansiaPro &copy; {new Date().getFullYear()}</span>
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
