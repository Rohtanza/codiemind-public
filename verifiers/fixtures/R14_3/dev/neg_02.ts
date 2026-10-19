import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function summarize(text: string, onToken: (t: string) => void) {
  const stream = anthropic.messages.stream({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `Summarize:\n${text}` }],
  });

  stream.on('text', onToken);
  const final = await stream.finalMessage();
  return final;
}
