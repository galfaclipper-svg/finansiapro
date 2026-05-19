import Link from 'next/link';
import { ArrowRight, BookOpen, Settings, Users, Package, FileText, Receipt, PieChart, TrendingUp, Download, CheckCircle2 } from 'lucide-react';
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
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Panduan Lengkap Penggunaan FinansiaProf
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Selamat datang di FinansiaProf! Ikuti langkah-langkah di bawah ini untuk menguasai aplikasi dan mengatur keuangan bisnis Anda dengan sangat mudah, bahkan bagi orang awam sekalipun.
          </p>
        </div>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              1
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg">Pengaturan Awal (Settings)</h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Langkah pertama yang wajib Anda lakukan adalah mengisi profil bisnis Anda. Mengapa? Karena data ini akan otomatis digunakan sebagai <strong>Kop Surat (Header)</strong> pada Invoice PDF dan Laporan Excel Anda.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Buka menu <strong>Pengaturan</strong> di sidebar.</li>
                <li>Isi Nama Perusahaan, Alamat, Email, dan Telepon.</li>
                <li>Klik tombol "Simpan Profil".</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              2
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg">Manajemen Kontak (Clients)</h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Sebelum membuat tagihan (Invoice), Anda harus mendaftarkan pelanggan Anda ke dalam sistem agar datanya bisa ditarik secara otomatis.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Buka menu <strong>Kontak</strong>.</li>
                <li>Klik tombol <strong>"Tambah Kontak"</strong> di sudut kanan atas.</li>
                <li>Masukkan nama lengkap, alamat, email, dan WhatsApp pelanggan.</li>
                <li>Data ini nantinya akan muncul di <i>dropdown</i> saat membuat Invoice.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              3
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg">Manajemen Stok (Inventory)</h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Jika Anda menjual barang fisik, catat barang Anda di sini. FinansiaProf akan <strong>menambah/mengurangi stok secara otomatis</strong> setiap kali ada transaksi Penjualan atau Pembelian Barang.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Masuk ke menu <strong>Inventaris</strong>.</li>
                <li>Klik "Tambah Barang", masukkan Nama, SKU (Kode), Harga Beli, Harga Jual, dan Stok Awal.</li>
                <li>Jika ada transaksi penjualan, stok otomatis berkurang.</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              4
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg">Pencatatan Transaksi Harian</h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Jantung dari aplikasi ini. Semua uang masuk dan keluar wajib dicatat agar Laporan Keuangan Anda akurat. Ada 2 cara mencatat: <strong>Manual</strong> atau <strong>AI Scan</strong>.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Buka menu <strong>Transaksi</strong>, lalu klik "Transaksi Baru".</li>
                <li><strong>Cara Manual:</strong> Pilih tipe Kas Masuk/Keluar, masukkan nominal, pilih kategori (misal: Pendapatan Penjualan atau Beban Gaji), lalu simpan.</li>
                <li><strong>Cara AI Scan:</strong> Klik tab "AI Scan", unggah foto Struk Belanja atau Bukti Transfer. AI kami akan otomatis membaca nominal, tanggal, dan mengategorikannya untuk Anda!</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              5
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg">Pembuatan & Download Invoice</h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Buat tagihan profesional dan kirimkan ke pelanggan Anda.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Buka menu <strong>Invoices</strong>, klik "Buat Invoice".</li>
                <li>Pilih Pelanggan dari dropdown, tambahkan daftar barang/jasa yang ditagih.</li>
                <li>Setelah disimpan, klik baris invoice tersebut. Akan muncul panel detail di sebelah kanan.</li>
                <li>Klik tombol <strong>"Download PDF"</strong> untuk mengunduh tagihan siap cetak/kirim.</li>
                <li>Jika invoice sudah dibayar, ubah statusnya menjadi "Paid". Sistem akan <strong>otomatis</strong> membuatkan catatan Pemasukan di menu Transaksi!</li>
              </ul>
            </div>
          </div>

          {/* Step 6 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              6
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <PieChart className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg">Business Planner & Simulasi BEP</h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Ingin tahu apakah bisnis Anda akan untung atau rugi? Gunakan fitur pintar ini.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Buka menu <strong>Business Planner</strong>.</li>
                <li>Pilih jenis usaha Anda (Jasa, Retail, atau Manufaktur).</li>
                <li>Masukkan perkiraan biaya dan target keuntungan.</li>
                <li>Sistem akan menyimulasikan berapa harga jual ideal dan berapa target penjualan minimum agar Anda tidak rugi (Titik Impas / BEP).</li>
              </ul>
            </div>
          </div>

          {/* Step 7 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              7
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm ring-2 ring-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-blue-900">Laporan Keuangan (Export Excel)</h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Setelah semua transaksi tercatat, Laporan Keuangan akan terbuat dengan sendirinya.
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-2 mb-4">
                <li>Buka menu <strong>Laporan</strong>. Di sini Anda bisa melihat Laba Rugi, Neraca, Jurnal Umum, dan BEP/ROI.</li>
                <li>Untuk mengunduh, cari kotak bernama <strong>"Export Laporan ke Excel"</strong>.</li>
                <li>Klik tombol <strong>"Download Laporan (.xlsx)"</strong>.</li>
                <li>File Excel yang terunduh sangat rapi, terpisah per <i>sheet</i> (Jurnal, Buku Besar, Laba Rugi, dsb), lengkap dengan Logo Perusahaan Anda (jika sudah diunggah di menu Pengaturan).</li>
              </ul>
              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <p>Laporan Excel ini sudah diformat khusus dan siap diprint di kertas A4 tanpa perlu Anda rapikan lagi!</p>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-20 text-center border-t border-slate-200 pt-12 pb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Siap untuk Memulai?</h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            Anda telah mempelajari seluruh alur kerja FinansiaProf. Sekarang, mari aplikasikan pada bisnis Anda dan nikmati kemudahan mencatat keuangan secara instan.
          </p>
          <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" asChild>
            <Link href="/dashboard">
              Masuk ke Dashboard Sekarang <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
