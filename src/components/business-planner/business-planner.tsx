'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HppCalculator } from './hpp-calculator';
import { PricingRecommendation } from './pricing-recommendation';
import { TargetAnalysis } from './target-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppContext } from '@/contexts/app-provider';
import { PlannerState } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { DownloadCloud, FileText, Table } from "lucide-react";
import { exportPlannerToExcel, exportPlannerToPdf } from '@/lib/export-planner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function BusinessPlanner() {
  const context = React.useContext(AppContext);
  if (!context) throw new Error('AppContext required');
  const { plannerState, setPlannerState } = context;

  const handleChange = React.useCallback((updates: Partial<PlannerState>) => {
    setPlannerState(prev => {
      // Check if any keys are actually different to avoid infinite loop renders
      let hasChanges = false;
      for (const key in updates) {
        if (updates[key as keyof PlannerState] !== prev[key as keyof PlannerState]) {
          hasChanges = true;
          break;
        }
      }
      if (hasChanges) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  }, []);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Alat Perencana & Simulasi</CardTitle>
          <CardDescription>
            Hitung HPP, tentukan harga jual, dan proyeksikan keuntungan bisnis Anda.
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <DownloadCloud className="w-4 h-4" /> Export Hasil
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportPlannerToExcel(plannerState, context.companyProfile)} className="gap-2 cursor-pointer">
              <Table className="w-4 h-4 text-green-600" /> Export ke Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPlannerToPdf(plannerState, context.companyProfile)} className="gap-2 cursor-pointer">
              <FileText className="w-4 h-4 text-red-600" /> Export ke PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      {plannerState.businessType === 'retail' && (
        <div className="px-6 pb-4 flex items-center justify-end space-x-2">
          <Label htmlFor="multi-product-mode" className="text-sm text-muted-foreground font-medium cursor-pointer">
            Mode Multi-Produk (Batch)
          </Label>
          <Switch 
            id="multi-product-mode" 
            checked={plannerState.isMultiProduct} 
            onCheckedChange={(checked) => handleChange({ isMultiProduct: checked })}
          />
        </div>
      )}

      <CardContent>
        <Tabs defaultValue="hpp" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6">
            <TabsTrigger value="hpp">1. Kalkulator HPP</TabsTrigger>
            <TabsTrigger value="pricing">2. Rekomendasi Harga</TabsTrigger>
            <TabsTrigger value="analysis">3. Analisis Target & ROI</TabsTrigger>
          </TabsList>
          <TabsContent value="hpp">
            <HppCalculator 
              state={plannerState} 
              onChange={handleChange} 
            />
          </TabsContent>
          <TabsContent value="pricing">
            <PricingRecommendation 
              state={plannerState} 
              onChange={handleChange} 
            />
          </TabsContent>
          <TabsContent value="analysis">
            <TargetAnalysis state={plannerState} onChange={handleChange} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
