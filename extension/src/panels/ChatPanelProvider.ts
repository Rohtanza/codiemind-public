import * as vscode from 'vscode';
import * as api from '../api/client';
import { guessCategory, parseCommand, COMMANDS } from '../commands/commandParser';
import { MemoryService } from '../services/memoryService';
import { ChatMessage, MemoryItem, UsedMemory } from '../types';
import { generateId, toMemoryItems, webviewHtml } from '../utils/helpers';

const SESSION_KEY = 'codiemind.sessionId';
const MAX_QUERY_CHARS = 4000; // backend ChatRequest.query limit
const MEMORY_TAG = /\[(pref|dec):([a-f0-9-]{36})\]/g; // the assembler's and the model's id tags

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codiemind.chatPanel';

  private _view?: vscode.WebviewView;
  private _ready = false;
  private _pending: unknown[] = [];
  private _sessionId: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _state: vscode.Memento,
    private readonly _memory: MemoryService
  ) {
    this._sessionId = _state.get<string>(SESSION_KEY) ?? this._newSessionId();
    _memory.onDidChangeConnection(state => this._post({ type: 'connection', state }));
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    this._ready = false;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    webviewView.webview.html = this._getHtml(webviewView.webview);
    webviewView.onDidDispose(() => { this._view = undefined; this._ready = false; });

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'ready':
          this._ready = true;
          this._post({ type: 'init', state: this._memory.connection, commands: COMMANDS });
          for (const m of this._pending.splice(0)) { this._view?.webview.postMessage(m); }
          void this._memory.checkHealth();
          break;
        case 'send':
          await this._handleUserMessage(String(data.text ?? ''));
          break;
        case 'insertCode':
          await this._insertCode(String(data.code ?? ''));
          break;
        case 'newFile':
          await this._openInNewFile(String(data.code ?? ''), String(data.lang ?? ''));
          break;
        case 'copy':
          await vscode.env.clipboard.writeText(String(data.text ?? ''));
          break;
        case 'openMemories':
          await vscode.commands.executeCommand('codiemind.openMemories', data.id);
          break;
        case 'checkConnection':
          await this._memory.checkHealth();
          this._post({ type: 'connection', state: this._memory.connection });
          break;
      }
    });
  }

  /** Start a new conversation: clears the panel and opens a fresh backend session. */
  public newChat(): void {
    this._sessionId = this._newSessionId();
    this._post({ type: 'reset' });
  }

  /** Send a prepared query (used by "Ask CodieMind About Selection"). */
  public async ask(text: string): Promise<void> {
    await vscode.commands.executeCommand(`${ChatPanelProvider.viewType}.focus`);
    this._post({ type: 'echoUser', text });
    await this._handleUserMessage(text);
  }

  private _newSessionId(): string {
    const id = `vscode-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    void this._state.update(SESSION_KEY, id);
    return id;
  }

  private async _handleUserMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) { return; }
    const parsed = parseCommand(trimmed);
    const label = parsed.type === 'chat' ? 'Retrieving your memories and generating a reply' : 'Working';
    this._post({ type: 'thinking', on: true, label });
    try {
      switch (parsed.type) {
        case 'remember': await this._remember(parsed.text); break;
        case 'decide': await this._decide(parsed.text, parsed.rationale); break;
        case 'forget': await this._forget(parsed.text); break;
        case 'memories': await this._showMemories(); break;
        case 'context': await this._showContext(); break;
        case 'help': this._add({ id: generateId(), role: 'help', timestamp: now() }); break;
        case 'chat': await this._chat(trimmed); break;
      }
    } catch (err) {
      this._addError(err, trimmed);
    } finally {
      this._post({ type: 'thinking', on: false });
    }
  }

  private async _remember(content: string): Promise<void> {
    if (!content) {
      this._notice('Add the preference after the command, for example: @remember Always use arrow functions in TypeScript', 'warning');
      return;
    }
    const resp = await api.remember({ content, category: guessCategory(content), scope_type: 'project' });
    await this._memory.refresh(false);
    this._add({
      id: generateId(), role: 'event', kind: 'remembered', timestamp: now(),
      item: this._memory.find(resp.id) ?? {
        id: resp.id, kind: 'preference', content: resp.content, rationale: null, category: resp.category,
        scopeType: resp.scope_type, importance: resp.importance, source: 'explicit', createdAt: resp.created_at,
      },
    });
  }

  private async _decide(content: string, rationale?: string): Promise<void> {
    if (!content) {
      this._notice('Add the decision after the command, for example: @decide Use axios for HTTP requests because it supports interceptors', 'warning');
      return;
    }
    const resp = await api.decide({ content, rationale: rationale || content });
    await this._memory.refresh(false);
    this._add({
      id: generateId(), role: 'event', kind: 'decided', timestamp: now(),
      item: this._memory.find(resp.id) ?? {
        id: resp.id, kind: 'decision', content: resp.content, rationale: resp.rationale, category: 'architecture',
        scopeType: resp.scope_type, importance: resp.importance, source: 'explicit', createdAt: resp.created_at,
      },
    });
  }

  private async _forget(keyword: string): Promise<void> {
    if (!keyword) {
      this._notice('Add a keyword after the command, for example: @forget arrow functions', 'warning');
      return;
    }
    const items = toMemoryItems(await api.listMemories('project'));
    const match = items.find(m => m.content.toLowerCase().includes(keyword.toLowerCase()));
    if (!match) {
      this._notice(`No stored memory contains "${keyword}".`, 'info');
      return;
    }
    const resp = await api.forget(match.id);
    if (!resp.deleted) {
      this._notice(`No stored memory contains "${keyword}".`, 'info');
      return;
    }
    await this._memory.refresh(false);
    this._add({ id: generateId(), role: 'event', kind: 'forgotten', item: match, timestamp: now() });
  }

  private async _showMemories(): Promise<void> {
    const items = toMemoryItems(await api.listMemories('project'));
    void this._memory.refresh(false);
    this._add({ id: generateId(), role: 'memories', items, timestamp: now() });
  }

  private async _showContext(): Promise<void> {
    try {
      const bd = await api.getLastContext();
      this._add({
        id: generateId(), role: 'context', timestamp: now(),
        context: {
          query: bd.user_query, assembledAt: bd.assembled_at, totalTokens: bd.total_tokens,
          budget: bd.budget, slots: bd.slots.map(s => ({ name: s.name, tokens: s.tokens, content: s.content })),
        },
      });
    } catch (err) {
      if (err instanceof api.BackendError && err.status === 404) {
        this._notice('No prompt has been assembled yet. Ask a question first, then use @context.', 'info');
        return;
      }
      throw err;
    }
  }

  private async _chat(query: string): Promise<void> {
    const resp = await api.chat({ query: query.slice(0, MAX_QUERY_CHARS), session_id: this._sessionId });
    // Retrieved = every memory id the assembler wrote into the prompt slots.
    // Cited = the ids the model echoed back in its reply (the backend's applied_*_ids).
    const retrieved = new Set<string>();
    for (const slot of resp.prompt_breakdown.slots) {
      if (/Conversation|Query/.test(slot.name)) { continue; } // earlier replies may quote ids
      for (const m of slot.content.matchAll(MEMORY_TAG)) { retrieved.add(m[2]); }
    }
    const cited = new Set([...resp.applied_preference_ids, ...resp.applied_decision_ids]);
    const ids = [...new Set([...retrieved, ...cited])];
    if (ids.some(id => !this._memory.find(id))) { await this._memory.refresh(false); }
    const used: UsedMemory[] = ids
      .map(id => this._memory.find(id))
      .filter((m): m is MemoryItem => !!m)
      .map(m => ({ ...m, cited: cited.has(m.id) }))
      .sort((x, y) => Number(y.cited) - Number(x.cited));
    this._add({ id: generateId(), role: 'assistant', text: resp.text, usedMemories: used, timestamp: now() });
  }

  private _notice(text: string, tone: 'info' | 'warning'): void {
    this._add({ id: generateId(), role: 'notice', tone, text, timestamp: now() });
  }

  private _addError(err: unknown, retryText: string): void {
    const offline = err instanceof api.BackendError && err.status === 0;
    if (offline) { this._memory.markOffline(); }
    const detail = err instanceof Error ? err.message : String(err);
    this._add({
      id: generateId(), role: 'error', timestamp: now(), offline,
      title: offline ? 'CodieMind backend is not running' : 'Something went wrong',
      detail: offline
        ? `Start it in codiemind/backend with: uv run uvicorn app.main:app --port 8000 (current URL: ${api.backendUrl()})`
        : detail,
      retryText,
    });
  }

  private _add(message: ChatMessage): void {
    this._post({ type: 'message', message });
  }

  private _post(message: unknown): void {
    if (this._view && this._ready) {
      void this._view.webview.postMessage(message);
    } else {
      this._pending.push(message);
    }
  }

  private async _insertCode(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors[0];
    if (!editor) {
      await this._openInNewFile(code, '');
      return;
    }
    await editor.edit(b => {
      for (const sel of editor.selections) { b.replace(sel, code); }
    });
    await vscode.window.showTextDocument(editor.document, editor.viewColumn);
  }

  private async _openInNewFile(code: string, lang: string): Promise<void> {
    const language = LANGUAGE_IDS[lang.toLowerCase()] ?? (lang || undefined);
    const doc = await vscode.workspace.openTextDocument({ content: code, language });
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  private _getHtml(webview: vscode.Webview): string {
    return webviewHtml(webview, this._extensionUri, {
      styles: ['chat.css'],
      scripts: ['vendor/highlight.min.js', 'markdown.js', 'chat.js'],
      body: `
  <header class="topbar">
    <div class="brand"><img class="brand-mark" src="{{media}}codiemind-mark.svg" alt=""><span>CodieMind</span></div>
    <button class="status-pill" id="status" title="Backend status" aria-live="polite">
      <span class="dot"></span><span class="label">Connecting</span>
    </button>
  </header>
  <main class="messages" id="messages" aria-live="polite"></main>
  <footer class="composer-wrap">
    <div class="command-menu" id="command-menu" role="listbox" hidden></div>
    <div class="composer" id="composer">
      <textarea id="input" rows="1" placeholder="Ask CodieMind, or type @ for commands" aria-label="Message"></textarea>
      <div class="composer-bar">
        <button class="icon-btn" id="at-btn" title="Commands (@)" aria-label="Show commands"><span class="codicon codicon-mention"></span></button>
        <span class="hint">Enter to send · Shift+Enter for a new line</span>
        <button class="send-btn" id="send" title="Send (Enter)" aria-label="Send" disabled><span class="codicon codicon-send"></span></button>
      </div>
    </div>
  </footer>`,
    });
  }
}

function now(): string { return new Date().toISOString(); }

const LANGUAGE_IDS: Record<string, string> = {
  ts: 'typescript', typescript: 'typescript', tsx: 'typescriptreact', js: 'javascript', javascript: 'javascript',
  jsx: 'javascriptreact', py: 'python', python: 'python', sh: 'shellscript', bash: 'shellscript', shell: 'shellscript',
  json: 'json', html: 'html', css: 'css', sql: 'sql', java: 'java', go: 'go', rust: 'rust', md: 'markdown',
  yaml: 'yaml', yml: 'yaml', cpp: 'cpp', c: 'c', csharp: 'csharp', cs: 'csharp', php: 'php', ruby: 'ruby',
};
