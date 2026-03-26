'use server';
/**
 * @fileOverview An AI agent for scanning transaction proofs, extracting details, and categorizing them.
 *
 * - scanAndCategorizeTransaction - A function that handles the transaction scanning and categorization process.
 * - ScanAndCategorizeTransactionInput - The input type for the scanAndCategorizeTransaction function.
 * - ScanAndCategorizeTransactionOutput - The return type for the scanAndCategorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanAndCategorizeTransactionInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a receipt or bank transfer proof, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  coaCategories: z
    .array(z.string())
    .describe('A list of available Chart of Accounts categories.'),
});
export type ScanAndCategorizeTransactionInput = z.infer<
  typeof ScanAndCategorizeTransactionInputSchema
>;

const ScanAndCategorizeTransactionOutputSchema = z.object({
  date: z.string().describe('The extracted transaction date in YYYY-MM-DD format.'),
  amount: z.number().describe('The extracted transaction amount.'),
  description: z.string().describe('A brief description of the transaction.'),
  suggestedCategory: z
    .string()
    .describe('The most appropriate Chart of Accounts category from the provided list.'),
  type: z
    .enum(['cash-in', 'cash-out'])
    .describe(
      'The type of the transaction, either cash-in or cash-out based on the context of the document.'
    ),
});
export type ScanAndCategorizeTransactionOutput = z.infer<
  typeof ScanAndCategorizeTransactionOutputSchema
>;

export async function scanAndCategorizeTransaction(
  input: ScanAndCategorizeTransactionInput
): Promise<ScanAndCategorizeTransactionOutput> {
  return scanAndCategorizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanAndCategorizeTransactionPrompt',
  input: {schema: ScanAndCategorizeTransactionInputSchema},
  output: {schema: ScanAndCategorizeTransactionOutputSchema},
  prompt: `You are an expert accounting assistant. Your task is to analyze the provided image of a financial document (receipt or bank transfer proof),
and extract the transaction date, amount, and a brief description.

Based on the document, determine if this is a cash-in (e.g., sales, receiving payment) or cash-out (e.g., expense, purchase) transaction and set the 'type' field accordingly.

Then, based on the transaction details, suggest the most appropriate category from the given Chart of Accounts (COA) categories.

Image: {{media url=imageDataUri}}

Available Chart of Accounts Categories: {{{coaCategories}}}

Extract the following details and categorize the transaction:`,
});

const scanAndCategorizeTransactionFlow = ai.defineFlow(
  {
    name: 'scanAndCategorizeTransactionFlow',
    inputSchema: ScanAndCategorizeTransactionInputSchema,
    outputSchema: ScanAndCategorizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
