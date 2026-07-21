import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-50 font-sans">
      <header className="px-4 lg:px-12 h-20 flex items-center bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-[#CCFF00]" />
          <span className="font-extrabold text-xl tracking-tight text-white">FinansiaProf</span>
        </Link>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Syarat dan Ketentuan Layanan</h1>
        
        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Penerimaan Syarat dan Ketentuan</h2>
            <p>Dengan mengakses dan menggunakan sistem <strong>FinansiaProf</strong>, Anda dianggap telah membaca, memahami, dan menyetujui seluruh Syarat dan Ketentuan yang berlaku. Jika Anda tidak menyetujui Syarat dan Ketentuan ini, Anda tidak diperkenankan untuk menggunakan layanan ini.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Layanan Kami</h2>
            <p>FinansiaProf adalah platform perangkat lunak manajemen keuangan (SaaS) yang membantu bisnis mengotomatiskan pencatatan transaksi, mengelola piutang (kasbon), memonitor inventaris, serta mencetak laporan keuangan. Layanan ini diberikan "sebagaimana adanya" (as is) dan dapat mengalami pembaruan atau perbaikan dari waktu ke waktu tanpa pemberitahuan sebelumnya.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Hak Kekayaan Intelektual (HAKI)</h2>
            <p>Semua komponen sistem termasuk desain, antarmuka pengguna, kode sumber (source code), dan algoritma adalah milik sah dari pengembang (Wisesa Niskala). Anda diberikan lisensi terbatas, non-eksklusif, dan tidak dapat dialihkan untuk menggunakan perangkat lunak ini hanya untuk kepentingan bisnis internal Anda. Anda dilarang menggandakan, menyalin, menjual kembali, atau merekayasa balik (reverse engineer) platform ini tanpa izin tertulis.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Penggunaan yang Diperbolehkan</h2>
            <p>Anda setuju untuk tidak menggunakan sistem FinansiaProf untuk tujuan ilegal atau melanggar hukum apa pun. Anda bertanggung jawab penuh atas segala aktivitas yang terjadi di bawah akun Anda serta menjaga kerahasiaan kredensial akses (username/password) milik Anda.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Pembatasan Tanggung Jawab</h2>
            <p>FinansiaProf berupaya semaksimal mungkin agar sistem berjalan tanpa hambatan. Namun, kami tidak menjamin bahwa sistem akan bebas dari gangguan (downtime) atau error. Kami tidak bertanggung jawab atas kerugian finansial, kehilangan data, maupun kerugian bisnis akibat dari penggunaan atau ketidakmampuan menggunakan sistem kami.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Pembaruan Syarat dan Ketentuan</h2>
            <p>Kami berhak untuk mengubah, memodifikasi, menambah, atau menghapus bagian mana pun dari Syarat dan Ketentuan ini kapan saja. Perubahan akan berlaku segera setelah dipublikasikan di halaman ini.</p>
          </section>

          <section className="pt-8 border-t border-white/10 mt-12">
            <h3 className="font-bold text-white mb-2">Punya pertanyaan?</h3>
            <p>Jika Anda memiliki pertanyaan mengenai Syarat dan Ketentuan ini, silakan hubungi kami di <a href="mailto:wisesaniskala@gmail.com" className="text-[#CCFF00] hover:underline">wisesaniskala@gmail.com</a> atau WhatsApp di <strong>+6288-1010-12-9990</strong>.</p>
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
