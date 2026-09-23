'use client';

import * as React from 'react';
import { AppContext } from '@/contexts/app-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DownloadCloud } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SimulationState } from '@/lib/types';
import { exportSimulationToExcel } from '@/lib/export-simulation';

export function SimulationProjection() {
  const context = React.useContext(AppContext);
  if (!context) throw new Error('AppContext required');
  const { simulationState, setSimulationState, inventory, transactions, companyProfile } = context;

  const handleChange = (updates: Partial<SimulationState>) => {
    setSimulationState((prev: any) => ({ ...prev, ...updates }));
  };

  const handleChannelChange = (channel: 'eceran'|'reseller'|'agen'|'borongan', qty: number) => {
    setSimulationState((prev: any) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: { ...prev.channels[channel], qty }
      }
    }));
  };

  const handleExport = () => {
    exportSimulationToExcel(simulationState, inventory, transactions, companyProfile);
  };

  const totalPcs = simulationState.channels.eceran.qty + simulationState.channels.reseller.qty + simulationState.channels.agen.qty + simulationState.channels.borongan.qty;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div>
          <h3 className="font-bold text-blue-900">Proyeksi Modal 12 Bulan (Eksklusif)</h3>
          <p className="text-sm text-blue-700">Atur parameter di bawah ini, lalu ekspor ke Excel untuk melihat neraca 12 bulan penuh yang interaktif.</p>
        </div>
        <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <DownloadCloud className="w-4 h-4" /> Ekspor ke Excel (Siap Cetak)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 border p-4 rounded-lg">
          <h4 className="font-semibold text-lg border-b pb-2">Target Penjualan (Pcs) / 12 Bulan</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Eceran</Label>
              <Input type="number" value={simulationState.channels.eceran.qty} onChange={(e) => handleChannelChange('eceran', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Reseller</Label>
              <Input type="number" value={simulationState.channels.reseller.qty} onChange={(e) => handleChannelChange('reseller', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Agen</Label>
              <Input type="number" value={simulationState.channels.agen.qty} onChange={(e) => handleChannelChange('agen', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Borongan</Label>
              <Input type="number" value={simulationState.channels.borongan.qty} onChange={(e) => handleChannelChange('borongan', Number(e.target.value))} />
            </div>
          </div>
          <div className="pt-2 text-sm font-bold">Total Target Terjual: {totalPcs.toLocaleString('id-ID')} pcs</div>
        </div>

        <div className="space-y-4 border p-4 rounded-lg">
          <h4 className="font-semibold text-lg border-b pb-2">Asumsi & Modal</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Biaya Operasional per Bulan (Rp)</Label>
              <Input type="number" value={simulationState.operationalCostPerMonth} onChange={(e) => handleChange({ operationalCostPerMonth: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Biaya Marketing per Bulan (Rp)</Label>
              <Input type="number" value={simulationState.marketingCostPerMonth} onChange={(e) => handleChange({ marketingCostPerMonth: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Bulan Didanai (Op)</Label>
                 <Input type="number" value={simulationState.monthsToFundOp} onChange={(e) => handleChange({ monthsToFundOp: Number(e.target.value) })} />
               </div>
               <div className="space-y-2">
                 <Label>Bulan Didanai (Mkt)</Label>
                 <Input type="number" value={simulationState.monthsToFundMkt} onChange={(e) => handleChange({ monthsToFundMkt: Number(e.target.value) })} />
               </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground bg-gray-50 p-4 rounded-md">
        Catatan: Fitur canggih ini memproses data master Anda (Inventaris, Neraca, Harga Jual) ke dalam formula kompleks. Sebagian parameter seperti bobot waktu (1-12 bulan) dan komposisi stok secara default menggunakan proporsi standar bisnis, dan dapat Anda modifikasi langsung di dalam file Excel hasil ekspor.
      </div>
    </div>
  );
}
