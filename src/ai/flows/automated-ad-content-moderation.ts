'use server';
/**
 * @fileOverview A Genkit flow for automated ad content moderation.
 *
 * - automateAdContentModeration - A function that handles the ad content moderation process.
 * - AutomatedAdContentModerationInput - The input type for the automateAdContentModeration function.
 * - AutomatedAdContentModerationOutput - The return type for the automateAdContentModeration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedAdContentModerationInputSchema = z.object({
  title: z.string().describe('The title of the advertisement.'),
  description: z.string().describe('The description of the advertisement.'),
});
export type AutomatedAdContentModerationInput = z.infer<typeof AutomatedAdContentModerationInputSchema>;

const AutomatedAdContentModerationOutputSchema = z.object({
  flagged: z.boolean().describe('True if the ad content is inappropriate or potentially harmful, otherwise false.'),
  reason: z.string().describe('The reason why the ad was flagged, or "N/A" if not flagged.'),
});
export type AutomatedAdContentModerationOutput = z.infer<typeof AutomatedAdContentModerationOutputSchema>;

const moderationPrompt = ai.definePrompt({
  name: 'adContentModerationPrompt',
  input: {schema: AutomatedAdContentModerationInputSchema},
  output: {schema: AutomatedAdContentModerationOutputSchema},
  prompt: `You are an expert content moderator for an online classifieds marketplace named MarketNest. Your task is to evaluate user-submitted advertisement content for appropriateness and potential harm.

Analyze the following ad title and description for any content that falls into categories such as:
- Hate speech
- Sexually explicit content
- Harassment
- Dangerous content (e.g., illegal activities, incitement to violence)
- Civic integrity issues (e.g., misinformation, election interference)

Based on your analysis, determine if the ad content should be flagged. Provide a clear and concise reason if it is flagged. If the content is appropriate, set 'flagged' to false and 'reason' to "N/A".

Ad Title: "{{{title}}}"
Ad Description: "{{{description}}}"`, 
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const automateAdContentModerationFlow = ai.defineFlow(
  {
    name: 'automateAdContentModerationFlow',
    inputSchema: AutomatedAdContentModerationInputSchema,
    outputSchema: AutomatedAdContentModerationOutputSchema,
  },
  async (input) => {
    const {output} = await moderationPrompt(input);
    return output!;
  }
);

export async function automateAdContentModeration(input: AutomatedAdContentModerationInput): Promise<AutomatedAdContentModerationOutput> {
  return automateAdContentModerationFlow(input);
}
