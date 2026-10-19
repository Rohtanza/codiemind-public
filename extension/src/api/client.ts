import * as vscode from 'vscode';

function getBaseUrl(): string {
  return vscode.workspace.getConfiguration('codiemind').get<string>('backendUrl', 'http://localhost:8000');
}

class BackendError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
    this.name = 'BackendError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const err = await resp.json() as { detail?: string };
      if (err.detail) { detail = err.detail; }
    } catch { /* use default */ }
    throw new BackendError(resp.status, detail);
  }
  return resp.json() as Promise<T>;
}

// --- Response types matching backend Pydantic schemas ---

export interface RememberResponse {
  id: string;
  content: string;
  category: string;
  scope_type: string;
  importance: number;
  created_at: string;
}

export interface DecideResponse {
  id: string;
  content: string;
  rationale: string;
  scope_type: string;
  importance: number;
  created_at: string;
}

export interface ForgetResponse {
  deleted: boolean;
  kind: string;
}

export interface PreferenceItem {
  id: string;
  content: string;
  category: string;
  scope_type: string;
  importance: number;
  source: string;
  created_at: string;
}

export interface DecisionItem {
  id: string;
  content: string;
  rationale: string;
  scope_type: string;
  importance: number;
  created_at: string;
}

export interface ListMemoriesResponse {
  preferences: PreferenceItem[];
  decisions: DecisionItem[];
}

export interface SlotBreakdown {
  name: string;
  tokens: number;
  content: string;
}

export interface PromptBreakdown {
  assembled_at: string;
  user_query: string;
  slots: SlotBreakdown[];
  total_tokens: number;
  budget: number;
}

export interface ChatResponse {
  text: string;
  applied_preference_ids: string[];
  applied_decision_ids: string[];
  prompt_breakdown: PromptBreakdown;
}

export interface HealthResponse {
  status: string;
  chat_model: string;
  embedding_model: string;
}

// --- API methods ---

export async function remember(req: {
  content: string;
  category?: string;
  scope_type?: string;
  importance?: number;
  source?: string;
}): Promise<RememberResponse> {
  return request<RememberResponse>('POST', '/memory/remember', req);
}

export async function decide(req: {
  content: string;
  rationale: string;
  scope_type?: string;
  importance?: number;
}): Promise<DecideResponse> {
  return request<DecideResponse>('POST', '/memory/decide', req);
}

export async function forget(id: string): Promise<ForgetResponse> {
  return request<ForgetResponse>('DELETE', `/memory/forget/${id}`);
}

export async function listMemories(scope: string = 'project'): Promise<ListMemoriesResponse> {
  return request<ListMemoriesResponse>('GET', `/memory/list?scope=${encodeURIComponent(scope)}`);
}

export async function chat(req: {
  query: string;
  file_path?: string;
}): Promise<ChatResponse> {
  return request<ChatResponse>('POST', '/chat', req);
}

export async function getLastContext(): Promise<PromptBreakdown> {
  return request<PromptBreakdown>('GET', '/context/last');
}

export async function health(): Promise<HealthResponse> {
  return request<HealthResponse>('GET', '/health');
}
