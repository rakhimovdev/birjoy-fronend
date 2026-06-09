'use server';
/**
 * @fileOverview This file implements a Genkit flow that provides AI-powered suggestions
 * to enrich ad descriptions and generates relevant keywords based on initial user input
 * (title, category, and optionally existing description) to optimize listings.
 *
 * - smartAdDescriptionTool - A function that handles the ad description and keyword generation process.
 * - SmartAdDescriptionToolInput - The input type for the smartAdDescriptionTool function.
 * - SmartAdDescriptionToolOutput - The return type for the smartAdDescriptionTool function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartAdDescriptionToolInputSchema = z.object({
  title: z.string().describe('The title of the advertisement.'),
  category: z.string().describe('The category of the advertisement.'),
  description: z.string().optional().describe('An optional existing description of the advertisement.'),
});
export type SmartAdDescriptionToolInput = z.infer<typeof SmartAdDescriptionToolInputSchema>;

const SmartAdDescriptionToolOutputSchema = z.object({
  suggestedDescriptionImprovements: z.string().describe('Suggested improvements for the ad description.'),
  relevantKeywords: z.array(z.string()).describe('A list of relevant keywords for the advertisement.'),
});
export type SmartAdDescriptionToolOutput = z.infer<typeof SmartAdDescriptionToolOutputSchema>;

const smartAdDescriptionPrompt = ai.definePrompt({
  name: 'smartAdDescriptionPrompt',
  input: {schema: SmartAdDescriptionToolInputSchema},
  output: {schema: SmartAdDescriptionToolOutputSchema},
  prompt: `You are an expert marketer and copywriter specializing in creating compelling classified ad descriptions and optimizing them for discoverability.
Your goal is to help a user enrich their ad description and generate relevant keywords based on the provided ad details.

Here's the ad information:
Title: {{{title}}}
Category: {{{category}}}
{{#if description}}
Current Description: {{{description}}}
{{/if}}

Based on the above information, provide:
1.  **Suggested improvements for the ad description.** Focus on making it more appealing, informative, and engaging for potential buyers. If an existing description is provided, suggest specific enhancements to it. If no description is provided, generate a compelling one.
2.  **A list of relevant keywords** that someone might use to search for this item. Include both general and specific terms.

Return the output in JSON format, matching the output schema provided.`,
});

const smartAdDescriptionToolFlow = ai.defineFlow(
  {
    name: 'smartAdDescriptionToolFlow',
    inputSchema: SmartAdDescriptionToolInputSchema,
    outputSchema: SmartAdDescriptionToolOutputSchema,
  },
  async (input) => {
    const {output} = await smartAdDescriptionPrompt(input);
    return output!;
  }
);

export async function smartAdDescriptionTool(input: SmartAdDescriptionToolInput): Promise<SmartAdDescriptionToolOutput> {
  return smartAdDescriptionToolFlow(input);
}
