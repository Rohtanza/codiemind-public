import * as ai from 'ai';
import { mistral } from '@ai-sdk/mistral';

export async function streamStory(prompt, write) {
  const result = ai.streamText({
    model: mistral('mistral-large-latest'),
    prompt,
  });

  for await (const delta of result.textStream) {
    write(delta);
  }
}
