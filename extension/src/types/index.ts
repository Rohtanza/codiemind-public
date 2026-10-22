// Shapes passed from the extension host to the webviews. Field names are camelCase on this side
// of the boundary; the API client keeps the backend's snake_case.

export type MemoryKind = 'preference' | 'decision';

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  content: string;
  rationale: string | null;
  category: string;
  scopeType: string;
  importance: number;
  source: string;
  createdAt: string;
}

/** A memory that was retrieved into the prompt; `cited` is true when the reply cites its id. */
export interface UsedMemory extends MemoryItem {
  cited: boolean;
}

export interface ContextSlot {
  name: string;
  tokens: number;
  content: string;
}

export interface ContextView {
  query: string;
  assembledAt: string;
  totalTokens: number;
  budget: number;
  slots: ContextSlot[];
}

export type ChatMessage =
  | { id: string; role: 'user'; text: string; timestamp: string }
  | { id: string; role: 'assistant'; text: string; timestamp: string; usedMemories: UsedMemory[] }
  | { id: string; role: 'event'; kind: 'remembered' | 'decided' | 'forgotten'; item: MemoryItem; timestamp: string }
  | { id: string; role: 'memories'; items: MemoryItem[]; timestamp: string }
  | { id: string; role: 'context'; context: ContextView; timestamp: string }
  | { id: string; role: 'help'; timestamp: string }
  | { id: string; role: 'notice'; tone: 'info' | 'warning'; text: string; timestamp: string }
  | { id: string; role: 'error'; title: string; detail: string; retryText: string | null; offline: boolean; timestamp: string };
