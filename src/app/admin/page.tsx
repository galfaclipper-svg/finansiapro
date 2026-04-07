'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { licenseService, LicenseData } from '@/lib/license-service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Key, Clock, User, LogOut, Loader2, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [licenses, setLicenses] = useState<LicenseData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLicenses();
  }, [user]);

  const fetchLicenses = async () => {
    if (!user?.email) return;
    try {
      setIsLoading(true);
      const data = await licenseService.getAllLicenses(user.email);
      setLicenses(data);
    } catch (err) {
      console.error(err);
      toast({ title: 'Gagal memuat lisensi', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user?.email) return;
    try {
      setIsGenerating(true);
      const code = await licenseService.generateLicense(user.email);
      toast({ title: 'Lisensi Berhasil Dibuat', description: `Kode: ${code}` });
      await fetchLicenses();
    } catch (err: any) {
      toast({ title: 'Gagal membuat lisensi', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: 'Tersalin', description: 'Kode lisensi disalin ke clipboard.' });
  };

  // Safe date formatter explicitly handling Timestamp, JS Date, or undefined
  const formatDate = (dateObj: any) => {
     if (!dateObj) return '-';
     // Firestore Timestamp has toMillis()
     if (typeof dateObj.toMillis === 'function') {
        return format(dateObj.toMillis(), 'dd MMM yyyy HH:mm');
     }
     // Regular JS Date
     if (dateObj instanceof Date) {
        return format(dateObj, 'dd MMM yyyy HH:mm');
     }
     return '-';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 tracking-tight">Admin Portal</h1>
            <p className="text-sm text-gray-500">Manajemen Lisensi FinansiaPro</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-right">
            <p className="font-medium text-gray-900">{user?.email}</p>
            <p className="text-gray-500">Administrator</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Daftar Lisensi</h2>
            <p className="text-gray-500 mt-1">Kelola dan pantau penggunaan kode lisensi aplikasi.</p>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating} className="shadow-sm">
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Generate Lisensi Baru
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
               <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
               <p>Memuat data lisensi...</p>
             </div>
          ) : licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Key className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900">Belum ada lisensi</p>
              <p className="text-sm mb-6">Mulai dengan membuat kode lisensi pertama Anda.</p>
              <Button onClick={handleGenerate} variant="outline">
                 Generate Sekarang
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Kode Lisensi</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Dibuat Pada</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Pengguna</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {licenses.map((license) => (
                    <tr key={license.code} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-gray-900 text-base tracking-wider bg-gray-100 px-3 py-1 rounded inline-block">
                          {license.code}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {license.isUsed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Terpakai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Tersedia
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <Clock className="h-3.5 w-3.5" />
                           {formatDate(license.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {license.isUsed ? (
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <User className="h-4 w-4 opacity-70" />
                            <div className="group relative">
                              <span className="truncate max-w-[150px] block cursor-help" title={license.usedByUserEmail || license.usedByUserId || ''}>
                                {license.usedByUserEmail ? license.usedByUserEmail : (license.usedByUserId ? `${license.usedByUserId.substring(0,8)}...` : 'N/A')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(license.code)}
                          className="h-8 text-gray-500 hover:text-gray-900"
                        >
                          {copiedCode === license.code ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span className="sr-only">Copy</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
