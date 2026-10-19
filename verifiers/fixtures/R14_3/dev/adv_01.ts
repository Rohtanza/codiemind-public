import OpenAI from 'openai';

const client = new OpenAI();

// Thin helper so call sites read like the AI SDK's streamText.
async function streamText(opts: { prompt: string }) {
  return client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: opts.prompt }],
    stream: true,
  });
}

export async function draftEmail(topic: string) {
  const stream = await streamText({ prompt: `Write an email about ${topic}` });
  let out = '';
  for await (const chunk of stream) {
    out += chunk.choices[0]?.delta?.content ?? '';
  }
  return out;
}
