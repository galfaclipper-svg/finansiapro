'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useAppState } from '@/hooks/use-app-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { UserPlus, Wallet, Send, Printer, ReceiptText, ArrowDownRight, ArrowUpRight, CheckCircle2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

export function KasbonManager() {
  const { employees, addEmployee, transactions, addTransaction } = useAppState();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [txType, setTxType] = useState<'kasbon' | 'bayar'>('kasbon');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [txDesc, setTxDesc] = useState('');
  const [txAccount, setTxAccount] = useState('Kas Bank BCA'); // Default cash account

  const reportRef = useRef<HTMLDivElement>(null);

  // Auto-migrate legacy Kasbon transactions that have "A/n. XXX" but no employeeId
  useEffect(() => {
    // This is just a virtual migration for the UI. Real DB migration would update the docs.
    // For now, we will extract names and make sure they are in the employees list.
    const legacyNames = new Set<string>();
    transactions.forEach(t => {
      if (t.category === 'Piutang Karyawan' && !t.employeeId) {
        let nameMatch = t.description.match(/A\/n\.\s*([\w\s]+)/i);
        if (nameMatch && nameMatch[1]) {
          legacyNames.add(nameMatch[1].trim());
        } else {
           // Fallback to extraction from Kasbon ...
           nameMatch = t.description.match(/Kasbon\s+([\w\s]+)/i);
           if (nameMatch && nameMatch[1]) {
              legacyNames.add(nameMatch[1].trim());
           }
        }
      }
    });

    legacyNames.forEach(name => {
      const exists = employees.find(e => e.name.toLowerCase() === name.toLowerCase());
      if (!exists && name.length > 0) {
        console.log("Auto-creating missing employee record for legacy data:", name);
        addEmployee({ name: name, position: 'Karyawan', notes: 'Auto-migrated' });
      }
    });
  }, [transactions, employees, addEmployee]);

  // Map legacy transactions to their newly created/existing employeeId
  const enrichedTransactions = useMemo(() => {
    return transactions.map(t => {
      if (t.category === 'Piutang Karyawan' && !t.employeeId) {
         let nameMatch = t.description.match(/A\/n\.\s*([\w\s]+)/i) || t.description.match(/Kasbon\s+([\w\s]+)/i);
         if (nameMatch && nameMatch[1]) {
            const empName = nameMatch[1].trim();
            const emp = employees.find(e => e.name.toLowerCase() === empName.toLowerCase());
            if (emp) {
              return { ...t, employeeId: emp.id };
            }
         }
      }
      return t;
    });
  }, [transactions, employees]);

  // Compute Balances
  const employeeBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    employees.forEach(e => { balances[e.id] = 0; });
    
    enrichedTransactions.forEach(t => {
      if (t.category === 'Piutang Karyawan' && t.employeeId) {
        if (t.type === 'cash-out') {
          // Kasbon diberikan (Piutang bertambah)
          balances[t.employeeId] = (balances[t.employeeId] || 0) + t.amount;
        } else if (t.type === 'cash-in') {
          // Kasbon dibayar (Piutang berkurang)
          balances[t.employeeId] = (balances[t.employeeId] || 0) - t.amount;
        }
      }
    });
    return balances;
  }, [enrichedTransactions, employees]);

  // Filter Transactions for Report
  const filteredTransactions = useMemo(() => {
    let filtered = enrichedTransactions.filter(t => t.category === 'Piutang Karyawan');
    
    if (selectedEmployeeId !== 'all') {
      filtered = filtered.filter(t => t.employeeId === selectedEmployeeId);
    }
    
    if (selectedMonth) {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth));
    }
    
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [enrichedTransactions, selectedEmployeeId, selectedMonth]);

  const monthTotalKeluar = filteredTransactions.filter(t => t.type === 'cash-out').reduce((sum, t) => sum + t.amount, 0);
  const monthTotalMasuk = filteredTransactions.filter(t => t.type === 'cash-in').reduce((sum, t) => sum + t.amount, 0);

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) return;
    await addEmployee({ name: newEmployeeName });
    setNewEmployeeName('');
    setIsAddEmployeeOpen(false);
    toast({ title: "Berhasil", description: "Karyawan baru ditambahkan." });
  };

  const handleAddTransaction = async () => {
    if (selectedEmployeeId === 'all') {
      toast({ title: "Error", description: "Pilih Karyawan terlebih dahulu", variant: "destructive" });
      return;
    }
    const amount = Number(txAmount);
    if (!amount || amount <= 0) return;

    const emp = employees.find(e => e.id === selectedEmployeeId);
    const descPrefix = txType === 'kasbon' ? 'Pemberian Kasbon' : 'Pembayaran Kasbon';
    
    const newTx = {
      date: txDate,
      description: `${descPrefix} A/n. ${emp?.name} - ${txDesc}`,
      amount,
      type: txType === 'kasbon' ? 'cash-out' : 'cash-in' as 'cash-in'|'cash-out',
      accountId: txAccount,
      category: 'Piutang Karyawan',
      employeeId: selectedEmployeeId
    };

    await addTransaction(newTx);
    
    setTxAmount('');
    setTxDesc('');
    setIsTransactionOpen(false);
    toast({ title: "Berhasil", description: "Transaksi kasbon dicatat." });
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const monthLabel = selectedMonth ? format(new Date(`${selectedMonth}-01`), 'MMMM yyyy', { locale: id }) : 'Semua Waktu';

  const generateReportText = () => {
    if (!selectedEmployee) return '';
    let text = `*Laporan Kasbon Karyawan*\n\n`;
    text += `Nama: *${selectedEmployee.name}*\n`;
    text += `Periode: *${monthLabel}*\n`;
    text += `Sisa Kasbon Saat Ini: *${formatCurrency(employeeBalances[selectedEmployee.id] || 0)}*\n\n`;
    text += `*Rincian Transaksi:*\n`;
    
    if (filteredTransactions.length === 0) {
      text += `_Tidak ada transaksi di periode ini_\n`;
    } else {
      filteredTransactions.forEach(t => {
        const typeLabel = t.type === 'cash-out' ? '🔴 Pinjam' : '🟢 Bayar';
        text += `- ${formatDate(t.date)}: ${typeLabel} ${formatCurrency(t.amount)} (${t.description})\n`;
      });
    }
    
    text += `\nTotal Pinjam Bulan Ini: ${formatCurrency(monthTotalKeluar)}\n`;
    text += `Total Bayar Bulan Ini: ${formatCurrency(monthTotalMasuk)}\n\n`;
    text += `_Dibuat otomatis oleh Sistem Finansia Pro_`;
    return text;
  };

  const handleShareWhatsApp = () => {
    if (selectedEmployeeId === 'all') {
      toast({ title: "Error", description: "Pilih 1 karyawan terlebih dahulu untuk dibagikan", variant: "destructive" });
      return;
    }
    const text = generateReportText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPNG = async () => {
    if (selectedEmployeeId === 'all') {
      toast({ title: "Error", description: "Pilih 1 karyawan terlebih dahulu", variant: "destructive" });
      return;
    }
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#0a0a0a' });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Laporan_Kasbon_${selectedEmployee?.name}_${selectedMonth}.png`;
      link.click();
      toast({ title: "Berhasil", description: "Laporan PNG berhasil diunduh." });
    } catch (err) {
      console.error(err);
      toast({ title: "Gagal", description: "Gagal membuat gambar PNG", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Controls & Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex gap-4 flex-wrap w-full md:w-auto">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <Label>Pilih Karyawan</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Karyawan..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Karyawan</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} - {formatCurrency(employeeBalances[e.id] || 0)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bulan</Label>
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto"><UserPlus className="w-4 h-4 mr-2"/> Karyawan Baru</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Karyawan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="Misal: Budi Santoso" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddEmployee}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto"><Wallet className="w-4 h-4 mr-2"/> Transaksi Kasbon</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Catat Kasbon / Pembayaran</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Karyawan</Label>
                  <Select value={selectedEmployeeId === 'all' ? '' : selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Karyawan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jenis Transaksi</Label>
                  <Select value={txType} onValueChange={(v: 'kasbon'|'bayar') => setTxType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kasbon">Beri Kasbon (Pinjaman)</SelectItem>
                      <SelectItem value="bayar">Terima Pembayaran Kasbon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jumlah (Rp)</Label>
                  <Input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="500000" />
                </div>
                <div className="space-y-2">
                  <Label>Sumber/Tujuan Kas (Akun)</Label>
                  <Select value={txAccount} onValueChange={setTxAccount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kas Fisik">Kas Fisik</SelectItem>
                      <SelectItem value="Kas Bank BCA">Kas Bank BCA</SelectItem>
                      <SelectItem value="Bank Mandiri">Bank Mandiri</SelectItem>
                      <SelectItem value="Bank BRI">Bank BRI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Keterangan Tambahan</Label>
                  <Input value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="Keperluan..." />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddTransaction} disabled={!selectedEmployeeId || selectedEmployeeId === 'all' || !txAmount}>Simpan Transaksi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Report View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ringkasan Sisa Kasbon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada data karyawan.</p>
                ) : employees.map(e => (
                  <div key={e.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                    <span className="text-sm font-medium">{e.name}</span>
                    <span className={`text-sm font-bold ${employeeBalances[e.id] > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(employeeBalances[e.id] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-border overflow-hidden" ref={reportRef}>
            <CardHeader className="bg-muted/30 border-b border-border pb-6 pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                    <ReceiptText className="w-6 h-6 text-primary" />
                    Laporan Kasbon Karyawan
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {selectedEmployeeId === 'all' ? 'Semua Karyawan' : `A/n. ${selectedEmployee?.name}`} • {monthLabel}
                  </CardDescription>
                </div>
                {selectedEmployee && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Sisa Kasbon Berjalan</p>
                    <p className="text-3xl font-bold text-destructive">{formatCurrency(employeeBalances[selectedEmployee.id] || 0)}</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Keluar (Pinjam)</TableHead>
                    <TableHead className="text-right">Masuk (Bayar)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Tidak ada transaksi kasbon pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.date)}</TableCell>
                      <TableCell>
                        {employees.find(e => e.id === t.employeeId)?.name || 'Tidak diketahui'}
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {t.type === 'cash-out' ? (
                          <div className="flex items-center justify-end gap-1">
                            <ArrowDownRight className="w-3 h-3" /> {formatCurrency(t.amount)}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-primary font-medium">
                        {t.type === 'cash-in' ? (
                          <div className="flex items-center justify-end gap-1">
                            <ArrowUpRight className="w-3 h-3" /> {formatCurrency(t.amount)}
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={3} className="text-right">Total Bulan Ini:</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(monthTotalKeluar)}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(monthTotalMasuk)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            
            {/* Visual signature / footer for PNG export */}
            <div className="p-6 border-t border-border bg-card flex justify-between items-center text-sm text-muted-foreground">
              <div>Dicetak dari: Finansia Pro</div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Laporan Tervalidasi
              </div>
            </div>
          </Card>

          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="outline" onClick={handleDownloadPNG} disabled={selectedEmployeeId === 'all'}>
              <Download className="w-4 h-4 mr-2" />
              Unduh PNG
            </Button>
            <Button onClick={handleShareWhatsApp} disabled={selectedEmployeeId === 'all'} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
              <Send className="w-4 h-4 mr-2" />
              Share via WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
