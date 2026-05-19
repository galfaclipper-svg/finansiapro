'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { licenseService } from '@/lib/license-service';
import { ShieldAlert, KeyRound, ArrowRight, Loader2, CheckCircle2, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function EnterLicensePage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !user) return;
    
    setIsLoading(true);
    try {
      await licenseService.validateAndClaimLicense(code, user.uid, user.email);
      setSuccess(true);
      toast({
        title: "Lisensi Berhasil Diverifikasi",
        description: "Akses aplikasi sekarang telah dibuka.",
      });
      // The LicenseProvider will detect the change in Firestore and redirect to / automatically.
    } catch (err: any) {
      toast({
        title: "Lisensi Gagal",
        description: err.message || "Kode lisensi tidak valid atau telah digunakan.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-300">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Terbuka!</h2>
             <p className="text-gray-500 mb-6">Lisensi berhasil divalidasi. Mengalihkan ke dashboard...</p>
             <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mx-auto" />
          </div>
        </div>
     );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-primary px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Akun Belum Aktif</h1>
          <p className="text-primary-foreground/80 mt-2 text-sm">
            Silakan masukkan kode lisensi untuk menggunakan FinansiaProf.
          </p>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="license-code" className="text-sm font-medium text-gray-700">
                Kode Lisensi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="license-code"
                  type="text"
                  placeholder="Contoh: ABCD-1234"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="pl-10 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-gray-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary uppercase tracking-widest transition-colors font-mono"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="w-full h-11 text-base font-semibold transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Aktifkan Aplikasi
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col space-y-4">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col items-center text-center space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Dapatkan Akses Penuh</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sudah melakukan pembayaran? Konfirmasikan nominal transfer Anda untuk menerima kode lisensi secara instan.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <a 
                  href={`https://wa.me/62881010129990?text=${encodeURIComponent(`Halo admin, saya ingin mengonfirmasi pembayaran aplikasi FinansiaProf.\n\nEmail Akun: ${user?.email || '...'}\nNominal Transfer: Rp [Isi Nominal]\nBank Tujuan: [Isi Bank]\n\nMohon segera dikirimkan kode lisensinya. Terima kasih.`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-sm h-10 px-4 py-2 w-full sm:w-auto"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Konfirmasi via WhatsApp
                </a>
                <a 
                  href={`mailto:wisesaniskala@gmail.com?subject=Konfirmasi Pembayaran FinansiaProf&body=${encodeURIComponent(`Halo admin,\n\nSaya ingin mengonfirmasi pembayaran untuk pembelian lisensi FinansiaProf.\n\nEmail Akun: ${user?.email || '...'}\nNominal Transfer: Rp [Isi Nominal]\nBank Tujuan: [Isi Bank]\n\nMohon dicek dan kirimkan kode lisensinya. (Silakan lampirkan bukti transfer pada email ini)\n\nTerima kasih.`)}`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm h-10 px-4 py-2 w-full sm:w-auto"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Konfirmasi via Email
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Masuk sebagai <span className="font-semibold text-gray-900">{user?.email}</span>
              </p>
              <button
                onClick={logout}
                className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
