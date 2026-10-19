import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';

const raw = new OpenAI();

export function chat(prompt: string) {
  return streamText({ model: openai('gpt-4o'), prompt }).toTextStreamResponse();
}

export async function embedTitle(title: string) {
  const res = await raw.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `Shorten: ${title}` }],
  });
  return res.choices[0].message.content;
}
