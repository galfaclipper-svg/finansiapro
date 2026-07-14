'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/hooks/use-app-state';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export default function ClosingPage() {
  const { companyProfile, setCompanyProfile } = useAppState();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const closedPeriods = companyProfile?.closedPeriods || [];
  const selectedPeriod = `${selectedYear}-${selectedMonth}`;
  const isClosed = closedPeriods.includes(selectedPeriod);

  if (!companyProfile?.isEnterpriseMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Mode Enterprise Dinonaktifkan</h2>
        <p className="text-muted-foreground mb-4">
          Fitur Tutup Buku hanya tersedia untuk Mode Enterprise. Aktifkan di menu Pengaturan.
        </p>
      </div>
    );
  }

  const handleToggleClose = () => {
    let newClosedPeriods = [...closedPeriods];
    
    if (isClosed) {
      // Un-close
      newClosedPeriods = newClosedPeriods.filter(p => p !== selectedPeriod);
      toast({ title: 'Buku Dibuka', description: `Periode ${selectedPeriod} telah dibuka kembali.` });
    } else {
      // Close
      newClosedPeriods.push(selectedPeriod);
      toast({ title: 'Tutup Buku Berhasil', description: `Periode ${selectedPeriod} telah dikunci permanen.` });
    }

    setCompanyProfile(prev => ({
      ...prev,
      closedPeriods: newClosedPeriods
    }));
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader
        title="Tutup Buku (Closing)"
        description="Kunci periode akuntansi untuk mencegah perubahan data secara tidak sengaja di masa lalu."
      />

      <Card>
        <CardHeader>
          <CardTitle>Status Periode</CardTitle>
          <CardDescription>Pilih bulan dan tahun untuk melihat atau mengubah status kuncian.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="w-1/2 space-y-2">
              <label className="text-sm font-medium">Bulan</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2 space-y-2">
              <label className="text-sm font-medium">Tahun</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center space-y-4 ${isClosed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            {isClosed ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-700">Periode Terkunci</h3>
                  <p className="text-sm text-red-600/80 max-w-md mx-auto mt-1">
                    Buku untuk periode <b>{MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</b> telah ditutup. Anda tidak dapat lagi menambah, mengedit, atau menghapus transaksi di bulan ini.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Unlock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-700">Periode Terbuka</h3>
                  <p className="text-sm text-green-600/80 max-w-md mx-auto mt-1">
                    Buku untuk periode <b>{MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</b> masih terbuka. Lakukan Tutup Buku jika semua rekonsiliasi dan laporan telah selesai.
                  </p>
                </div>
              </>
            )}

            <Button 
              variant={isClosed ? "outline" : "default"} 
              className={isClosed ? "border-red-300 text-red-600 hover:bg-red-100 mt-4" : "bg-red-600 hover:bg-red-700 text-white mt-4"}
              onClick={handleToggleClose}
            >
              {isClosed ? (
                <><Unlock className="w-4 h-4 mr-2" /> Buka Kuncian (Override)</>
              ) : (
                <><Lock className="w-4 h-4 mr-2" /> Eksekusi Tutup Buku</>
              )}
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 text-yellow-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>
              <b>Sistem FinansiaProf menghitung Laba Ditahan secara otomatis.</b><br/> 
              Anda tidak perlu membuat Jurnal Penutup (Closing Entries) manual untuk mengenolkan Pendapatan dan Beban. 
              Cukup kunci periode di halaman ini, maka sistem akan secara otomatis memindahkan Laba/Rugi ke Laba Ditahan untuk laporan di bulan berikutnya.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
