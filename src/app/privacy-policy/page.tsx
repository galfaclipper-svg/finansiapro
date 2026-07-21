import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-50 font-sans">
      <header className="px-4 lg:px-12 h-20 flex items-center bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-[#CCFF00]" />
          <span className="font-extrabold text-xl tracking-tight text-white">FinansiaProf</span>
        </Link>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Kebijakan Privasi</h1>
        
        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Pengumpulan Data</h2>
            <p><strong>FinansiaProf</strong> sangat menghargai dan melindungi privasi informasi Anda. Kami hanya mengumpulkan informasi yang esensial untuk keperluan registrasi, penyediaan layanan, dan bantuan teknis. Data tersebut dapat mencakup (namun tidak terbatas pada): nama, alamat email, detail bisnis, serta transaksi keuangan yang Anda masukkan ke dalam sistem kami.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Penggunaan Data</h2>
            <p>Data yang kami kumpulkan semata-mata digunakan untuk memproses pembukuan, memfasilitasi pembuatan laporan (PDF/Excel), serta untuk tujuan operasional akun Anda. Kami tidak akan menggunakan data finansial Anda untuk tujuan pemasaran eksternal tanpa persetujuan Anda.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Penyimpanan dan Keamanan</h2>
            <p>Kami menerapkan standar keamanan industri terkini untuk melindungi data pengguna dari akses yang tidak sah, pengubahan, pengungkapan, atau penghancuran. Basis data disimpan dalam lingkungan yang aman dan kami melakukan pembaruan keamanan secara berkala. Namun, pengguna menyadari bahwa tidak ada sistem transmisi data elektronik yang 100% aman.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Berbagi Data kepada Pihak Ketiga</h2>
            <p>FinansiaProf tidak akan memperjualbelikan, menyewakan, atau menukar data pribadi dan finansial pengguna kepada pihak ketiga. Kami hanya dapat membagikan informasi dalam situasi yang diwajibkan oleh hukum, proses hukum yang sah, atau perintah dari otoritas pemerintah yang berwenang.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Penggunaan Cookies</h2>
            <p>Platform kami menggunakan cookies atau teknologi pelacakan sejenis untuk menyimpan preferensi sesi login dan memastikan kelancaran fungsionalitas sistem. Anda dapat mengatur peramban (browser) Anda untuk menolak seluruh cookies, namun sebagian fitur aplikasi mungkin tidak berjalan secara maksimal.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Hak Pengguna</h2>
            <p>Anda memiliki hak untuk meminta akses, koreksi, atau penghapusan data pribadi Anda kapan saja dengan menghubungi dukungan teknis kami.</p>
          </section>

          <section className="pt-8 border-t border-white/10 mt-12">
            <h3 className="font-bold text-white mb-2">Kontak Kami</h3>
            <p>Untuk pertanyaan terkait kebijakan privasi dan keamanan data, silakan layangkan surel ke <a href="mailto:wisesaniskala@gmail.com" className="text-[#CCFF00] hover:underline">wisesaniskala@gmail.com</a>.</p>
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-white/10 bg-[#0A0A0A] py-8 text-center text-slate-500 text-sm">
        <div className="container px-4">
          FinansiaProf &copy; {new Date().getFullYear()} Wisesa Niskala. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
