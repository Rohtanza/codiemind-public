import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export async function answerWithWeather(question: string) {
  const { text } = await generateText({
    model: google('gemini-1.5-pro'),
    prompt: question,
    tools: {
      weather: tool({
        description: 'Get the weather for a city',
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, tempC: 21 }),
      }),
    },
    maxSteps: 3,
  });
  return text;
}
