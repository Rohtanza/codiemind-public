// Shared utilities: markdown rendering, token counting stubs

export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function estimateTokens(_text: string): number {
  // Stub: rough estimate of ~4 chars per token
  return Math.ceil(_text.length / 4);
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
