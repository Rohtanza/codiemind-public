import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const recipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

export async function suggestRecipe(dish: string) {
  const { object } = await generateObject({
    model: anthropic('claude-3-5-sonnet-latest'),
    schema: recipeSchema,
    prompt: `Generate a recipe for ${dish}.`,
  });
  return object;
}
