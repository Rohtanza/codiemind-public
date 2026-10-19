export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function truncateHistory(messages: Message[], max: number): Message[] {
  if (messages.length <= max) return messages;
  return messages.slice(messages.length - max);
}

export function formatTranscript(messages: Message[]): string {
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}
