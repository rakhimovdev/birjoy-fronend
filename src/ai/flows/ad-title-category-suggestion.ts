'use server';
/**
 * @fileOverview This file provides an AI flow to suggest ad titles and categories based on user input.
 *
 * - adTitleCategorySuggestion - A function that handles the ad title and category suggestion process.
 * - AdTitleCategorySuggestionInput - The input type for the adTitleCategorySuggestion function.
 * - AdTitleCategorySuggestionOutput - The return type for the adTitleCategorySuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdTitleCategorySuggestionInputSchema = z.object({
  description: z.string().describe('A brief description of the item the user wants to sell.'),
  imageDataUris: z
    .array(
      z
        .string()
        .describe(
          "A photo of the item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        )
    )
    .optional()
    .describe('Optional array of image data URIs of the item.'),
});
export type AdTitleCategorySuggestionInput = z.infer<typeof AdTitleCategorySuggestionInputSchema>;

const AdTitleCategorySuggestionOutputSchema = z.object({
  suggestedTitle: z.string().describe('A compelling and descriptive title for the classified ad.'),
  suggestedCategory: z.string().describe('The most relevant category for the item from a classifieds marketplace.'),
});
export type AdTitleCategorySuggestionOutput = z.infer<typeof AdTitleCategorySuggestionOutputSchema>;

export async function adTitleCategorySuggestion(
  input: AdTitleCategorySuggestionInput
): Promise<AdTitleCategorySuggestionOutput> {
  return adTitleCategorySuggestionFlow(input);
}

const adTitleCategorySuggestionPrompt = ai.definePrompt({
  name: 'adTitleCategorySuggestionPrompt',
  input: {schema: AdTitleCategorySuggestionInputSchema},
  output: {schema: AdTitleCategorySuggestionOutputSchema},
  prompt: `You are an expert marketer for a multi-category classifieds marketplace. Your goal is to help sellers create compelling ad listings.

Based on the provided description and any optional images, suggest a compelling title for the ad and the most relevant category.

Description: {{{description}}}

{{#if imageDataUris}}
Images:
{{#each imageDataUris}}
  {{media url=this}}
{{/each}}
{{/if}}

Please provide your suggestions in the specified JSON format.`,
});

const adTitleCategorySuggestionFlow = ai.defineFlow(
  {
    name: 'adTitleCategorySuggestionFlow',
    inputSchema: AdTitleCategorySuggestionInputSchema,
    outputSchema: AdTitleCategorySuggestionOutputSchema,
  },
  async input => {
    const {output} = await adTitleCategorySuggestionPrompt(input);
    return output!;
  }
);
