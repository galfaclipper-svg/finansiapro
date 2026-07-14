import Link from 'next/link';
import { ArrowRight, BookOpen, Settings, Users, Package, FileText, Receipt, PieChart, TrendingUp, Download, CheckCircle2, Shield, Lock, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function GuidePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-slate-800">FinansiaProf</span>
        </div>
        <div className="ml-auto">
          <Button asChild size="sm">
            <Link href="/dashboard">
              Masuk Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container max-w-4xl px-4 py-12 mx-auto">
        <div className="space-y-6 text-center mb-16">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4 shadow-sm">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Panduan Lengkap Penggunaan FinansiaProf
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Selamat datang di FinansiaProf! Ikuti pedoman sistematis di bawah ini untuk menguasai aplikasi dan mengatur keuangan bisnis Anda, mulai dari pencatatan dasar hingga fitur kelas Enterprise untuk perusahaan berkembang.
          </p>
        </div>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              1
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Settings className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Pengaturan Profil & Logo</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Langkah pertama yang sangat direkomendasikan adalah melengkapi identitas perusahaan. Data ini akan otomatis dicetak sebagai <strong>Kop Surat (Header)</strong> pada Invoice PDF maupun Laporan Excel Anda.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-2">
                <li>Buka menu <strong>Pengaturan</strong> di panel sebelah kiri.</li>
                <li>Isi Nama Perusahaan, Alamat, Email, dan Telepon.</li>
                <li>(Opsional) Aktifkan pengaturan tambahan jika diperlukan, lalu klik <strong>"Simpan Profil"</strong>.</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              2
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Manajemen Pelanggan (Clients)</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Sebelum dapat membuat tagihan (Invoice), Anda perlu menyimpan data pelanggan (klien) Anda. Data ini hanya perlu diinput satu kali saja.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-2">
                <li>Navigasi ke menu <strong>Kontak</strong>.</li>
                <li>Klik tombol <strong>"Tambah Kontak"</strong> di sudut kanan atas.</li>
                <li>Lengkapi formulir nama pelanggan, alamat, email, dan WhatsApp.</li>
                <li>Data ini akan otomatis muncul sebagai pilihan instan saat Anda membuat Invoice baru.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              3
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Package className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Inventaris & Manajemen Stok</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Bagi Anda yang menjual barang fisik, gunakan modul ini untuk melacak ketersediaan stok secara otomatis. Jika Anda berbisnis di bidang jasa, Anda dapat melewati langkah ini.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-2">
                <li>Masuk ke menu <strong>Inventaris</strong>.</li>
                <li>Klik <strong>"Tambah Barang"</strong>, dan isi rincian SKU, Harga Beli, Harga Jual, serta Stok Awal.</li>
                <li>Setiap transaksi penjualan yang merujuk pada SKU tersebut akan memotong stok secara <i>real-time</i>.</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              4
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Receipt className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Pencatatan Transaksi Harian</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Ini adalah jantung dari aplikasi. Mencatat pengeluaran dan pemasukan secara disiplin akan menghasilkan Laporan Keuangan yang akurat. FinansiaProf mendukung 2 metode praktis:
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-2">
                <li>Buka menu <strong>Transaksi</strong>, klik <strong>"Transaksi Baru"</strong>.</li>
                <li><strong>Opsi Manual:</strong> Pilih Kas Masuk/Keluar, ketikkan nominal, dan pilih kategori (misal: "Beban Listrik" atau "Pendapatan").</li>
                <li><strong>Opsi AI Scan (Kamera):</strong> Pindah ke tab <strong>"AI Scan"</strong>, lalu foto struk belanja Anda. Kecerdasan Buatan kami akan mendeteksi nominal, tanggal, dan langsung menebak kategorinya untuk Anda!</li>
              </ul>
            </div>
          </div>

          {/* Step 5 - ENTERPRISE MODE */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              5
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-indigo-900">Fitur Opsional: Mode Enterprise</h3>
              </div>
              <p className="text-slate-700 text-sm mb-4 leading-relaxed font-medium">
                Untuk perusahaan yang mulai bertumbuh dan membutuhkan standar Akuntansi formal (Jurnal Penyesuaian, Tutup Buku, Penyusutan), Anda dapat mengaktifkan <strong>Mode Enterprise</strong>.
              </p>
              <ul className="text-sm text-slate-700 list-disc pl-5 space-y-2 mb-4">
                <li>Buka <strong>Pengaturan</strong> lalu centang <strong>"Aktifkan Mode Enterprise"</strong>.</li>
                <li><strong>Jurnal Penyesuaian:</strong> Menu baru akan muncul untuk mencatat penyusutan aset, asuransi dibayar di muka, atau gaji terutang yang diinput secara <i>double-entry</i> di akhir bulan tanpa merusak arus kas harian Anda.</li>
                <li><strong>Tutup Buku (Closing):</strong> Gunakan menu Tutup Buku untuk mengunci (<i>Lock</i>) transaksi di bulan-bulan sebelumnya. Transaksi yang telah dikunci <strong>tidak bisa lagi diedit atau dihapus</strong>, melindungi data dari manipulasi <Lock className="inline w-3 h-3 mx-1 text-slate-500" />.</li>
                <li>Data transaksi lama (sebelum Enterprise) tidak akan hilang dan akan tetap bersinergi dengan baik.</li>
              </ul>
              <div className="text-xs text-indigo-600 bg-indigo-100/50 p-2 rounded border border-indigo-100">
                <i>*Mode ini ditujukan untuk Anda yang sudah paham dasar akuntansi. Jika Anda UMKM biasa, biarkan mode ini non-aktif untuk pengalaman yang simpel.</i>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              6
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Manajemen Invoice & PDF</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Buat dokumen tagihan yang tampak profesional dan langsung siap dikirim ke klien Anda.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-2">
                <li>Buka menu <strong>Invoices</strong>, klik "Buat Invoice".</li>
                <li>Pilih Pelanggan, tentukan jatuh tempo, dan rincikan item tagihan (baik dari katalog inventaris maupun jasa custom).</li>
                <li>Setelah tersimpan, klik baris invoice untuk membuka panel rincian.</li>
                <li>Klik tombol <strong>"Download PDF"</strong>. Jika invoice tersebut telah lunas, Anda dapat mengganti statusnya menjadi "Paid", dan sistem akan <strong>otomatis menambahkan Pemasukan</strong> di buku transaksi Anda.</li>
              </ul>
            </div>
          </div>

          {/* Step 7 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              7
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <PieChart className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Business Planner (BEP)</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Fitur simulasi cerdas untuk merencanakan kelayakan bisnis atau peluncuran produk baru.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-2">
                <li>Buka menu <strong>Business Planner</strong>.</li>
                <li>Pilih kategori jenis usaha (Misal: Retail, Manufaktur, Jasa).</li>
                <li>Masukkan proyeksi biaya tetap (sewa, gaji) dan biaya variabel (bahan baku per unit).</li>
                <li>Aplikasi akan secara matematis menghitung <strong>Titik Impas (BEP)</strong>—batas minimal penjualan agar bisnis Anda tidak rugi.</li>
              </ul>
            </div>
          </div>

          {/* Step 8 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              8
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <FileSpreadsheet className="w-32 h-32 text-green-900" />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="font-bold text-xl text-green-900">Ekspor Laporan (Kustomisasi)</h3>
              </div>
              <p className="text-slate-700 text-sm mb-4 leading-relaxed relative z-10 font-medium">
                Puncak dari seluruh pencatatan adalah Laporan Keuangan. Sistem secara otomatis merakit Laba Rugi, Neraca, Arus Kas, hingga Buku Besar untuk Anda.
              </p>
              <ul className="text-sm text-slate-700 list-disc pl-5 space-y-2 mb-5 relative z-10">
                <li>Buka menu <strong>Reports</strong>.</li>
                <li>Klik tombol <strong>Unduh (XLSX)</strong> untuk Format Excel, atau <strong>Cetak (PDF)</strong> untuk mencetak dokumen.</li>
                <li><strong>Inovasi Opsi Unduhan:</strong> Sebuah layar <i>pop-up</i> akan muncul, mempersilakan Anda untuk <strong>mencentang laporan mana saja</strong> yang ingin diunduh.
                  <ul className="pl-5 mt-2 space-y-1 list-circle text-slate-600">
                    <li>Tidak butuh Jurnal Umum? Cukup hilangkan centangnya.</li>
                    <li><i>Executive Dashboard (Power BI Style)</i> tersedia khusus jika Anda mengunduh dalam format <strong>Excel (XLSX)</strong>.</li>
                    <li>Sistem dirancang cerdas: Menyembunyikan <i>sheet</i> yang tidak dipilih pada Excel sehingga <strong>rumus matematika (SUM/References) di dalamnya tidak akan pernah rusak (error)</strong>.</li>
                  </ul>
                </li>
              </ul>
              <div className="bg-white/80 backdrop-blur p-3 rounded border border-green-200 text-sm text-green-800 flex items-start gap-2 relative z-10">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
                <p>Laporan Excel FinansiaProf sudah distandarisasi untuk memenuhi kriteria Audit formal dan siap dicetak langsung di kertas A4!</p>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-24 text-center border-t border-slate-200 pt-16 pb-12 bg-white rounded-3xl shadow-sm">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Siap untuk Memulai Perjalanan Anda?</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto text-lg">
            Pengetahuan adalah kekuatan, dan kini Anda telah menguasai cara kerja FinansiaProf seutuhnya. Mari kelola arus kas Anda bagaikan seorang profesional sejati.
          </p>
          <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/dashboard">
              Masuk ke Dashboard Utama <ArrowRight className="ml-3 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
