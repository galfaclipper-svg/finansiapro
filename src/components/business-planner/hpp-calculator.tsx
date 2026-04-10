'use client';

import * as React from 'react';
import { PlannerState, BusinessType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  state: PlannerState;
  onChange: (updates: Partial<PlannerState>) => void;
}

export function HppCalculator({ state, onChange }: Props) {
  const { jasaData, retailData, manufakturData } = state;

  React.useEffect(() => {
    let total = 0;
    if (state.businessType === 'jasa') {
      total = (jasaData.jamKerja * jasaData.tarifPerJam) + jasaData.material;
    } else if (state.businessType === 'retail') {
      total = retailData.hargaBeli + (retailData.totalOngkir / (retailData.jumlahItemOngkir || 1)) + retailData.kemasan;
    } else if (state.businessType === 'manufaktur') {
      total = manufakturData.bahanBaku + manufakturData.tenagaKerja + manufakturData.overhead;
    }
    onChange({ totalHpp: total });
  }, [state.businessType, jasaData, retailData, manufakturData, onChange]);

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  const renderJasaInputs = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Estimasi Jam Kerja</Label>
          <Input 
            type="number" min="0" step="0.1"
            value={jasaData.jamKerja || ''}
            onChange={(e) => onChange({ jasaData: { ...jasaData, jamKerja: parseFloat(e.target.value) || 0 } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Tarif per Jam (Rp)</Label>
          <CurrencyInput 
            value={jasaData.tarifPerJam || 0}
            onValueChange={(val) => onChange({ jasaData: { ...jasaData, tarifPerJam: val || 0 } })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Biaya Material Tambahan (Rp)</Label>
        <CurrencyInput 
          value={jasaData.material || 0}
          onValueChange={(val) => onChange({ jasaData: { ...jasaData, material: val || 0 } })}
        />
      </div>
    </div>
  );

  const renderRetailInputs = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="space-y-2">
        <Label>Harga Beli Produk (Per Unit) (Rp)</Label>
        <CurrencyInput
          value={retailData.hargaBeli || 0}
          onValueChange={(val) => onChange({ retailData: { ...retailData, hargaBeli: val || 0 } })}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Total Ongkos Kirim (Global) (Rp)</Label>
          <CurrencyInput 
            value={retailData.totalOngkir || 0}
            onValueChange={(val) => onChange({ retailData: { ...retailData, totalOngkir: val || 0 } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Jumlah Produk dalam Resi/Invoice</Label>
          <Input 
            type="number" min="1" step="1"
            value={retailData.jumlahItemOngkir || ''}
            onChange={(e) => onChange({ retailData: { ...retailData, jumlahItemOngkir: parseInt(e.target.value) || 1 } })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Biaya Kemasan (Per Unit) (Rp)</Label>
        <CurrencyInput 
          value={retailData.kemasan || 0}
          onValueChange={(val) => onChange({ retailData: { ...retailData, kemasan: val || 0 } })}
        />
      </div>
    </div>
  );

  const renderManufakturInputs = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="space-y-2">
        <Label>Biaya Bahan Baku (Per Unit) (Rp)</Label>
        <CurrencyInput 
          value={manufakturData.bahanBaku || 0}
          onValueChange={(val) => onChange({ manufakturData: { ...manufakturData, bahanBaku: val || 0 } })}
        />
      </div>
      <div className="space-y-2">
        <Label>Biaya Tenaga Kerja Langsung (Per Unit) (Rp)</Label>
        <CurrencyInput 
          value={manufakturData.tenagaKerja || 0}
          onValueChange={(val) => onChange({ manufakturData: { ...manufakturData, tenagaKerja: val || 0 } })}
        />
      </div>
      <div className="space-y-2">
        <Label>Biaya Overhead Pabrik (Per Unit) (Rp)</Label>
        <CurrencyInput 
          value={manufakturData.overhead || 0}
          onValueChange={(val) => onChange({ manufakturData: { ...manufakturData, overhead: val || 0 } })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Contoh: Listrik mesin, penyusutan alat yang dibebankan per unit produksi.
        </p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-muted/40">
            <CardTitle className="text-lg">Tipe Bisnis</CardTitle>
            <CardDescription>Pilih jenis usaha Anda untuk menyesuaikan formula HPP.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Model Bisnis</Label>
                <Select 
                  value={state.businessType} 
                  onValueChange={(val: BusinessType) => onChange({ businessType: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tipe bisnis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail / Trading</SelectItem>
                    <SelectItem value="manufaktur">Manufaktur / Produksi</SelectItem>
                    <SelectItem value="jasa">Jasa / Servis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                {state.businessType === 'jasa' && renderJasaInputs()}
                {state.businessType === 'retail' && renderRetailInputs()}
                {state.businessType === 'manufaktur' && renderManufakturInputs()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="border-border shadow-sm bg-primary/5 sticky top-20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Hasil HPP
            </CardTitle>
            <CardDescription>Total Harga Pokok Penjualan (HPP) per unit.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-background p-4 border border-border shadow-inner text-center">
              <span className="block text-sm text-muted-foreground mb-1">Total HPP per Unit</span>
              <span className="text-3xl font-bold text-primary">
                {formatter.format(state.totalHpp)}
              </span>
            </div>
          </CardContent>
          <CardFooter className="bg-primary/5 border-t border-primary/10 text-xs text-muted-foreground pt-4">
            *Nilai HPP ini akan digunakan sebagai dasar perhitungan rekomendasi harga jual pada tab selanjutnya.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
