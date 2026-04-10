'use client';

import * as React from 'react';
import { PlannerState } from './business-planner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tag, TrendingUp, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Props {
  state: PlannerState;
  onChange: (updates: Partial<PlannerState>) => void;
}

export function PricingRecommendation({ state, onChange }: Props) {
  const { pricingMethod: method, pricingPercentage: percentage } = state;

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  let recommendedPrice = 0;
  let profitPerUnit = 0;
  const activePercentage = typeof percentage === 'number' ? percentage : (parseFloat(percentage) || 0);

  if (state.totalHpp > 0) {
    if (method === 'markup') {
      recommendedPrice = state.totalHpp * (1 + activePercentage / 100);
    } else {
      if (activePercentage >= 100) {
        recommendedPrice = state.totalHpp * 10; 
      } else {
        recommendedPrice = state.totalHpp / (1 - activePercentage / 100);
      }
    }
    profitPerUnit = recommendedPrice - state.totalHpp;
  }

  React.useEffect(() => {
    onChange({ recommendedPrice });
  }, [recommendedPrice, onChange]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-muted/40">
            <CardTitle className="text-lg">Strategi Harga</CardTitle>
            <CardDescription>Tentukan target keuntungan Anda berdasarkan HPP yang dihitung.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                <span className="text-sm font-medium">Dasar HPP:</span>
                <span className="text-lg font-bold text-primary">{formatter.format(state.totalHpp)}</span>
              </div>

              <div className="space-y-4">
                <Label>Metode Perhitungan</Label>
                <RadioGroup 
                  value={method} 
                  onValueChange={(val: 'markup' | 'margin') => onChange({ pricingMethod: val })}
                  className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 bg-background hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="margin" id="margin" />
                    <Label htmlFor="margin" className="cursor-pointer font-normal flex-1">
                      <span className="block font-medium">Margin</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">% dari Harga Jual</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 bg-background hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="markup" id="markup" />
                    <Label htmlFor="markup" className="cursor-pointer font-normal flex-1">
                      <span className="block font-medium">Markup</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">% dari HPP</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Target Persentase: <span className="text-primary font-bold">{activePercentage}%</span></Label>
                  <Input 
                    type="number" 
                    min="1" max={method === 'margin' ? "99" : "1000"} 
                    className="w-24 text-right"
                    value={percentage}
                    onChange={(e) => onChange({ pricingPercentage: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) })}
                  />
                </div>
                <Slider 
                  value={[Math.max(1, activePercentage)]} 
                  min={1} 
                  max={method === 'margin' ? 99 : 200} 
                  step={1}
                  onValueChange={(v) => onChange({ pricingPercentage: v[0] })}
                  className="py-4"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card className="border-border shadow-sm bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Rekomendasi Harga
            </CardTitle>
            <CardDescription>Harga jual ideal ke pelanggan.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.totalHpp === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-background rounded-lg border border-dashed border-border h-full">
                <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm">Silakan isi Kalkulator HPP terlebih dahulu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-background p-4 border border-border shadow-inner text-center">
                  <span className="block text-sm text-muted-foreground mb-1">Harga Jual per Unit</span>
                  <span className="text-3xl font-bold text-primary">
                    {formatter.format(recommendedPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-md">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Estimasi Laba per Unit</span>
                  </div>
                  <span className="font-bold">{formatter.format(profitPerUnit)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
