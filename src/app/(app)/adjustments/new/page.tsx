'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/hooks/use-app-state';
import { useToast } from '@/hooks/use-toast';
import { CHART_OF_ACCOUNTS } from '@/lib/constants';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function NewAdjustmentPage() {
  const router = useRouter();
  const { addTransaction, accounts, companyProfile } = useAppState();
  const { toast } = useToast();
  
  const activeAccounts = accounts && accounts.length > 0 ? accounts : CHART_OF_ACCOUNTS;

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  const [lines, setLines] = useState([
    { id: '1', accountId: '', debit: '', credit: '' },
    { id: '2', accountId: '', debit: '', credit: '' }
  ]);

  if (!companyProfile?.isEnterpriseMode) {
    return (
      <div className="p-8 text-center">
        Mode Enterprise Dinonaktifkan.
      </div>
    );
  }

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), accountId: '', debit: '', credit: '' }]);
  };

  const updateLine = (id: string, field: string, value: string) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const newLine = { ...line, [field]: value };
        // Mutual exclusion: if debit has value, clear credit, and vice versa.
        if (field === 'debit' && value !== '') newLine.credit = '';
        if (field === 'credit' && value !== '') newLine.debit = '';
        return newLine;
      }
      return line;
    }));
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) {
      toast({ variant: 'destructive', title: 'Minimal 2 Baris', description: 'Jurnal ganda membutuhkan minimal 2 baris (Debit dan Kredit).' });
      return;
    }
    setLines(lines.filter(l => l.id !== id));
  };

  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Keterangan jurnal wajib diisi.' });
      return;
    }

    if (!isBalanced) {
      toast({ variant: 'destructive', title: 'Error', description: 'Total Debit dan Kredit harus seimbang (Balance).' });
      return;
    }

    const hasEmptyAccounts = lines.some(l => !l.accountId);
    if (hasEmptyAccounts) {
      toast({ variant: 'destructive', title: 'Error', description: 'Semua baris harus memilih akun.' });
      return;
    }

    const journalLines = lines.map(l => ({
      accountId: l.accountId,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
    }));

    try {
      await addTransaction({
        date,
        description,
        amount: totalDebit, // Use total debit as the gross transaction amount
        type: 'journal-entry',
        accountId: '', // Left blank for journal entries, rely on journalLines
        category: 'Jurnal Penyesuaian',
        journalLines,
      });

      toast({ title: 'Berhasil', description: 'Jurnal Penyesuaian berhasil disimpan.' });
      router.push('/adjustments');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal menyimpan jurnal.' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/adjustments"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Jurnal Penyesuaian</h1>
          <p className="text-muted-foreground text-sm">Masukkan entri akrual ganda secara manual (Debit/Kredit).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal Jurnal</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Keterangan / Referensi</Label>
                <Input id="description" placeholder="Mencatat penyusutan mesin bulan ini" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Baris Jurnal</CardTitle>
            <CardDescription>Pastikan total Debit dan Kredit seimbang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 mb-2 font-medium text-sm text-muted-foreground">
              <div className="col-span-6">Akun</div>
              <div className="col-span-3 text-right">Debit (Rp)</div>
              <div className="col-span-2 text-right">Kredit (Rp)</div>
              <div className="col-span-1 text-center">Aksi</div>
            </div>

            {lines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end md:items-center p-4 md:p-0 border rounded-lg md:border-none">
                <div className="col-span-1 md:col-span-6 space-y-2 md:space-y-0">
                  <Label className="md:hidden">Pilih Akun</Label>
                  <Select value={line.accountId} onValueChange={(val) => updateLine(line.id, 'accountId', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Akun..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map(acc => (
                        <SelectItem key={acc.name} value={acc.name}>
                          [{acc.id}] {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 md:col-span-3 space-y-2 md:space-y-0">
                  <Label className="md:hidden">Debit</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="text-right" 
                    value={line.debit} 
                    onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                    disabled={!!line.credit} 
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2 md:space-y-0">
                  <Label className="md:hidden">Kredit</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="text-right" 
                    value={line.credit} 
                    onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                    disabled={!!line.debit}
                  />
                </div>
                <div className="col-span-1 text-right md:text-center">
                  <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeLine(line.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" className="w-full mt-4 border-dashed" onClick={addLine}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Baris
            </Button>
            
            <div className="flex justify-end pt-6">
              <div className="w-full md:w-1/2 rounded-lg border bg-muted/30 p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground font-medium">Total Debit</span>
                  <span className="font-bold">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground font-medium">Total Kredit</span>
                  <span className="font-bold">{formatCurrency(totalCredit)}</span>
                </div>
                <div className={`flex justify-between pt-2 border-t font-bold text-lg ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>
                  <span>Selisih (Balance)</span>
                  <span>{formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/adjustments">Batal</Link>
          </Button>
          <Button type="submit" disabled={!isBalanced || totalDebit === 0}>
            <Save className="w-4 h-4 mr-2" /> Simpan Jurnal
          </Button>
        </div>
      </form>
    </div>
  );
}
