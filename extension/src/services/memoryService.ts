import * as vscode from 'vscode';
import * as api from '../api/client';
import { MemoryItem } from '../types';
import { toMemoryItems } from '../utils/helpers';

export interface ConnectionState {
  connected: boolean;
  chatModel: string | null;
  url: string;
}

/**
 * One cache of stored memories and backend status, shared by the chat panel, the memory
 * panel and the status bar, so all three always show the same thing.
 */
export class MemoryService implements vscode.Disposable {
  private _items: MemoryItem[] = [];
  private _connection: ConnectionState = { connected: false, chatModel: null, url: api.backendUrl() };
  private _timer: NodeJS.Timeout | undefined;

  private readonly _onDidChangeMemories = new vscode.EventEmitter<MemoryItem[]>();
  readonly onDidChangeMemories = this._onDidChangeMemories.event;
  private readonly _onDidChangeConnection = new vscode.EventEmitter<ConnectionState>();
  readonly onDidChangeConnection = this._onDidChangeConnection.event;

  get items(): MemoryItem[] { return this._items; }
  get connection(): ConnectionState { return this._connection; }

  start(): void {
    void this.refresh();
    this._timer = setInterval(() => { void this.checkHealth(); }, 15000);
  }

  async checkHealth(): Promise<ConnectionState> {
    const url = api.backendUrl();
    let next: ConnectionState;
    try {
      const h = await api.health();
      next = { connected: true, chatModel: h.chat_model, url };
    } catch {
      next = { connected: false, chatModel: null, url };
    }
    const changed = next.connected !== this._connection.connected
      || next.chatModel !== this._connection.chatModel || next.url !== this._connection.url;
    this._connection = next;
    if (changed) {
      this._onDidChangeConnection.fire(next);
      if (next.connected) { void this.refresh(false); }
    }
    return next;
  }

  /** Reload memories from the backend. Returns the fresh list (empty if offline). */
  async refresh(withHealth = true): Promise<MemoryItem[]> {
    if (withHealth) { await this.checkHealth(); }
    try {
      this._items = toMemoryItems(await api.listMemories('project'));
    } catch {
      return this._items;
    }
    this._onDidChangeMemories.fire(this._items);
    return this._items;
  }

  find(id: string): MemoryItem | undefined {
    return this._items.find(m => m.id === id);
  }

  markOffline(): void {
    if (this._connection.connected) {
      this._connection = { ...this._connection, connected: false };
      this._onDidChangeConnection.fire(this._connection);
    }
  }

  dispose(): void {
    if (this._timer) { clearInterval(this._timer); }
    this._onDidChangeMemories.dispose();
    this._onDidChangeConnection.dispose();
  }
}
