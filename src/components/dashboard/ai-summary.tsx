'use client';

import { useState } from 'react';
import { financialReportInsights } from '@/ai/flows/financial-report-insights-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/hooks/use-app-state';

export function AiSummary() {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { transactions } = useAppState();

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setSummary('');

    // Create dummy reports from transactions for the AI flow
    const incomeStatement = `Pendapatan: ${transactions.filter(t=>t.type==='cash-in').reduce((s,t)=>s+t.amount, 0)}, Beban: ${transactions.filter(t=>t.type==='cash-out').reduce((s,t)=>s+t.amount, 0)}`;
    const balanceSheet = `Aset: 10000, Kewajiban: 4000, Ekuitas: 6000`;

    try {
      const result = await financialReportInsights({
        incomeStatement,
        balanceSheet,
      });
      setSummary(result.summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal menghasilkan ringkasan AI.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Wawasan Berbasis AI
        </CardTitle>
        <CardDescription>
          Dapatkan ringkasan cepat kesehatan keuangan Anda yang dibuat oleh AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summary && !isLoading && (
          <div className="prose prose-sm max-w-none text-foreground/80">
            <p>{summary}</p>
          </div>
        )}
        {!summary && !isLoading && (
            <div className="text-center text-sm text-muted-foreground p-8">
                <p>Klik tombol untuk menghasilkan ringkasan keuangan Anda.</p>
            </div>
        )}
         {isLoading && (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )}

        <Button
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="mt-4 w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menghasilkan...
            </>
          ) : (
            'Hasilkan Ringkasan'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
