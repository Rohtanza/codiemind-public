// ── Preference & Decision ──────────────────────────────────

export type PreferenceCategory = "style" | "architecture" | "naming" | "tool" | "constraint";
export type PreferenceScope = "file" | "folder" | "project" | "global";
export type PreferenceSource = "explicit" | "implicit";

export interface Preference {
  id: string;
  content: string;
  category: PreferenceCategory;
  scopeType: PreferenceScope;
  scopePath: string | null;
  importance: number;
  source: PreferenceSource;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
}

export interface Decision {
  id: string;
  content: string;
  rationale: string | null;
  scopeType: PreferenceScope;
  scopePath: string | null;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

// ── Chat Messages ──────────────────────────────────────────

export type MessageType = "user" | "assistant" | "system" | "confirmation" | "memories" | "context";

export interface AppliedPreference {
  content: string;
  category: PreferenceCategory;
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  text: string;
  timestamp: string;
  appliedPreferences?: AppliedPreference[];
  detectedPreference?: string;
  suggestedCategory?: PreferenceCategory;
  suggestedScope?: PreferenceScope;
  memories?: Preference[];
  contextSlots?: ContextSlot[];
}

// ── Context Assembly ───────────────────────────────────────

export interface ContextSlot {
  slot: number;
  name: string;
  tokens: number;
  content: string;
}

export interface ContextBreakdown {
  slots: ContextSlot[];
  totalTokens: number;
  budgetLimit: number;
}

// ── Mock Backend Response ──────────────────────────────────

export interface MockResponse {
  type: MessageType;
  text: string;
  appliedPreferences?: AppliedPreference[];
  detectedPreference?: string;
  suggestedCategory?: PreferenceCategory;
  suggestedScope?: PreferenceScope;
  memories?: Preference[];
  contextSlots?: ContextSlot[];
  totalTokens?: number;
  budgetLimit?: number;
  storedPreference?: Partial<Preference>;
  storedDecision?: Partial<Decision>;
}
