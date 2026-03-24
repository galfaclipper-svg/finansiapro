'use server';
/**
 * @fileOverview This file implements a Genkit flow to analyze financial reports
 * (Income Statement, Balance Sheet) and provide a concise, natural language
 * summary of key performance indicators and actionable insights.
 *
 * - financialReportInsights - A function that handles the financial report analysis.
 * - FinancialReportInsightsInput - The input type for the financialReportInsights function.
 * - FinancialReportInsightsOutput - The return type for the financialReportInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialReportInsightsInputSchema = z.object({
  incomeStatement: z
    .string()
    .describe(
      'The Income Statement data, provided as a formatted string (e.g., plain text or JSON).'
    ),
  balanceSheet: z
    .string()
    .describe(
      'The Balance Sheet data, provided as a formatted string (e.g., plain text or JSON).'
    ),
});
export type FinancialReportInsightsInput = z.infer<
  typeof FinancialReportInsightsInputSchema
>;

const FinancialReportInsightsOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise natural language summary of key performance indicators and actionable insights derived from the financial reports.'
    ),
});
export type FinancialReportInsightsOutput = z.infer<
  typeof FinancialReportInsightsOutputSchema
>;

export async function financialReportInsights(
  input: FinancialReportInsightsInput
): Promise<FinancialReportInsightsOutput> {
  return financialReportInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialReportInsightsPrompt',
  input: {schema: FinancialReportInsightsInputSchema},
  output: {schema: FinancialReportInsightsOutputSchema},
  prompt: `You are an expert financial analyst. Your task is to analyze the provided Income Statement and Balance Sheet and generate a concise, natural language summary of key performance indicators (KPIs) and actionable insights for a business owner.

Focus on the most critical financial health indicators. Identify trends, strengths, weaknesses, and potential areas for improvement. Keep the summary professional, clear, and easy to understand for someone who is not a finance expert.

Income Statement:
{{{incomeStatement}}}

Balance Sheet:
{{{balanceSheet}}}`,
});

const financialReportInsightsFlow = ai.defineFlow(
  {
    name: 'financialReportInsightsFlow',
    inputSchema: FinancialReportInsightsInputSchema,
    outputSchema: FinancialReportInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
