'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HppCalculator } from './hpp-calculator';
import { PricingRecommendation } from './pricing-recommendation';
import { TargetAnalysis } from './target-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type BusinessType = 'jasa' | 'retail' | 'manufaktur';

export interface PlannerState {
  businessType: BusinessType;
  totalHpp: number;
  fixedCosts: number;
  recommendedPrice: number;
}

export function BusinessPlanner() {
  const [plannerState, setPlannerState] = React.useState<PlannerState>({
    businessType: 'retail',
    totalHpp: 0,
    fixedCosts: 0,
    recommendedPrice: 0,
  });

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
      <CardHeader>
        <CardTitle>Alat Perencana & Simulasi</CardTitle>
        <CardDescription>
          Hitung HPP, tentukan harga jual, dan proyeksikan keuntungan bisnis Anda.
        </CardDescription>
      </CardHeader>
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
            <TargetAnalysis state={plannerState} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
