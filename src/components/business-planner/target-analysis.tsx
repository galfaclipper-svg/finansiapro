'use client';

import * as React from 'react';
import { PlannerState } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Target, BarChart3, Wallet } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Props {
  state: PlannerState;
  onChange: (updates: Partial<PlannerState>) => void;
}

export function TargetAnalysis({ state, onChange }: Props) {
  const { fixedCosts = 5000000, investment = 20000000, targetUnits = 0 } = state;

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
  const numberFormatter = new Intl.NumberFormat('id-ID');

  const price = state.recommendedPrice;
  const variableCost = state.totalHpp;
  const contributionMargin = price - variableCost;

  // BEP Calculations
  let bepUnits = 0;
  let bepRevenue = 0;

  if (contributionMargin > 0) {
    bepUnits = Math.ceil(fixedCosts / contributionMargin);
    bepRevenue = bepUnits * price;
  }

  // Target Profit
  React.useEffect(() => {
    if (bepUnits > 0 && targetUnits === 0) {
      onChange({ targetUnits: Math.ceil(bepUnits * 1.5) }); // Default target 1.5x BEP
    }
  }, [bepUnits, targetUnits, onChange]);

  const targetRevenue = targetUnits * price;
  const targetTotalCost = fixedCosts + (targetUnits * variableCost);
  const targetProfit = targetRevenue - targetTotalCost;

  // ROI / ROA
  const monthlyROI = investment > 0 ? (targetProfit / investment) * 100 : 0;
  const paybackPeriodMonths = targetProfit > 0 ? investment / targetProfit : 0;

  // Chart Data Generator
  const generateChartData = React.useCallback(() => {
    const data = [];
    const step = Math.max(Math.ceil(bepUnits / 5), 10);
    const maxVal = Math.max(targetUnits + step, bepUnits * 2 + step);
    
    for (let u = 0; u <= maxVal; u += step) {
      data.push({
        unit: u,
        pendapatan: u * price,
        totalBiaya: fixedCosts + (u * variableCost),
        biayaTetap: fixedCosts,
      });
    }
    return data;
  }, [bepUnits, targetUnits, price, fixedCosts, variableCost]);

  const chartData = React.useMemo(() => generateChartData(), [generateChartData]);

  const renderTooltipContent = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length >= 2) {
      return (
        <div className="bg-background border border-border p-3 shadow-md rounded-lg text-sm">
          <p className="font-bold mb-2">Penjualan: {numberFormatter.format(label)} Unit</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{formatter.format(entry.value)}</span>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex items-center gap-2 font-bold text-primary">
            <span>Laba Bersih:</span>
            <span>{formatter.format(payload[0].value - payload[1].value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (state.totalHpp === 0 || state.recommendedPrice === 0) {
    return (
      <Card className="border-border border-dashed shadow-none bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">Data Belum Lengkap</p>
          <p className="text-sm">Selesaikan tahap Kalkulator HPP dan Rekomendasi Harga untuk dapat melihat analisis target.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-muted/40">
            <CardTitle className="text-lg">Asumsi Operasional</CardTitle>
            <CardDescription>Masukkan perkiraan biaya tetap per bulan dan nilai investasi awal.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Biaya Tetap per Bulan (Rp)</Label>
              <CurrencyInput 
                value={fixedCosts || 0}
                onValueChange={(val) => onChange({ fixedCosts: val || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Gaji bulanan, sewa tempat, internet, dll (yang tidak terpengaruh jumlah produksi).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Total Nilai Investasi / Modal Awal (Rp)</Label>
              <CurrencyInput 
                value={investment || 0}
                onValueChange={(val) => onChange({ investment: val || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Biaya beli aset, mesin, renovasi awal. Digunakan untuk hitung ROI.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-primary/5">
          <CardHeader className="pb-3 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Titik Impas (Break-Even Point)
            </CardTitle>
            <CardDescription>Target minimal untuk tidak rugi.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {contributionMargin <= 0 ? (
                <div className="text-destructive font-medium text-sm p-3 bg-destructive/10 rounded-md">
                  Peringatan: Harga jual lebih rendah atau sama dengan HPP. Anda mengalami kerugian struktural. Naikkan harga jual atau turunkan HPP.
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-end border-b border-border pb-3">
                    <span className="text-sm font-medium text-muted-foreground">BEP Unit / Bulan</span>
                    <span className="text-3xl font-bold text-primary">{numberFormatter.format(bepUnits)} <span className="text-base font-normal">Unit</span></span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-muted-foreground">BEP Omzet / Bulan</span>
                    <span className="text-3xl font-bold text-primary">{formatter.format(bepRevenue)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border bg-muted/40">
           <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Simulasi Profit & ROI Berdasarkan Target
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-2">
                <Label>Simulasi Target Penjualan (Jumlah Unit / Bulan)</Label>
                <CurrencyInput 
                  value={targetUnits || 0}
                  onValueChange={(val) => onChange({ targetUnits: val || 0 })}
                />
              </div>

              <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Proyeksi Omzet:</span>
                  <span className="font-bold">{formatter.format(targetRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Biaya:</span>
                  <span className="font-bold text-destructive">{formatter.format(targetTotalCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center bg-green-500/10 p-2 rounded text-green-700 dark:text-green-400">
                  <span className="font-medium text-sm text-foreground flex items-center gap-2">
                     <Wallet className="w-4 h-4" /> Est. Laba Bersih
                  </span>
                  <span className="font-bold">{formatter.format(targetProfit)}</span>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">ROI Bulanan:</span>
                  <span className="font-bold text-primary">{monthlyROI.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Waktu Balik Modal:</span>
                  <span className="font-bold text-primary">{paybackPeriodMonths > 0 ? `${paybackPeriodMonths.toFixed(1)} Bulan` : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 h-[400px]">
              <span className="text-sm font-semibold mb-4 block text-center text-muted-foreground">Grafik Break-Even Analysis</span>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="unit" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`} 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    width={60}
                  />
                  <RechartsTooltip content={renderTooltipContent} />
                  <Legend verticalAlign="top" height={36}/>
                  <Line 
                    type="monotone" 
                    dataKey="pendapatan" 
                    name="Pendapatan" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={false} 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalBiaya" 
                    name="Total Biaya" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={3} 
                    dot={false} 
                  />
                  {contributionMargin > 0 && targetUnits > 0 && Array.isArray(chartData) && chartData.find(d => d.unit === targetUnits) && (
                    <ReferenceDot 
                       x={targetUnits} 
                       y={targetRevenue} 
                       r={6} 
                       fill="hsl(var(--primary))" 
                       stroke="white" 
                       strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
