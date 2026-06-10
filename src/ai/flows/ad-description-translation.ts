'use server';
/**
 * @fileOverview This file implements a Genkit flow for translating ad descriptions.
 *
 * - translateAdDescription - A function that translates an ad description to a target language.
 * - AdDescriptionTranslationInput - The input type for the translateAdDescription function.
 * - AdDescriptionTranslationOutput - The return type for the translateAdDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdDescriptionTranslationInputSchema = z.object({
  description: z.string().describe('The ad description to be translated.'),
  targetLanguage: z.string().describe('The target language for the translation (e.g., "Uzbek", "English").'),
});
export type AdDescriptionTranslationInput = z.infer<typeof AdDescriptionTranslationInputSchema>;

const AdDescriptionTranslationOutputSchema = z.object({
  translatedDescription: z.string().describe('The translated ad description.'),
});
export type AdDescriptionTranslationOutput = z.infer<typeof AdDescriptionTranslationOutputSchema>;

export async function translateAdDescription(input: AdDescriptionTranslationInput): Promise<AdDescriptionTranslationOutput> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return {
      translatedDescription: input.description,
    };
  }

  try {
    return await adDescriptionTranslationFlow(input);
  } catch (error) {
    console.error('Translation fallback activated:', error);
    return {
      translatedDescription: input.description,
    };
  }
}

const adDescriptionTranslationPrompt = ai.definePrompt({
  name: 'adDescriptionTranslationPrompt',
  input: {schema: AdDescriptionTranslationInputSchema},
  output: {schema: AdDescriptionTranslationOutputSchema},
  prompt: `Translate the following ad description into {{{targetLanguage}}}.

Ad Description:
{{{description}}}

Translated Description:`,
});

const adDescriptionTranslationFlow = ai.defineFlow(
  {
    name: 'adDescriptionTranslationFlow',
    inputSchema: AdDescriptionTranslationInputSchema,
    outputSchema: AdDescriptionTranslationOutputSchema,
  },
  async input => {
    const {output} = await adDescriptionTranslationPrompt(input);
    return output!;
  }
);
