import * as vscode from 'vscode';
import * as api from '../api/client';
import { MemoryService } from '../services/memoryService';
import { webviewHtml } from '../utils/helpers';

export class MemoryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codiemind.memoryPanel';

  private _view?: vscode.WebviewView;
  private _ready = false;
  private _highlightId: string | null = null;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly _memory: MemoryService) {
    _memory.onDidChangeMemories(() => this._sendData());
    _memory.onDidChangeConnection(() => this._sendData());
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    this._ready = false;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    webviewView.webview.html = this._getHtml(webviewView.webview);
    webviewView.onDidDispose(() => { this._view = undefined; this._ready = false; });
    webviewView.onDidChangeVisibility(() => { if (webviewView.visible) { void this._memory.refresh(); } });

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'ready':
          this._ready = true;
          this._sendData();
          void this._memory.refresh();
          break;
        case 'delete':
          try {
            await api.forget(String(data.id));
          } catch (err) {
            vscode.window.showErrorMessage(`CodieMind: could not delete the memory. ${err instanceof Error ? err.message : err}`);
          }
          await this._memory.refresh(false);
          break;
        case 'edit':
          await this._edit(data);
          break;
        case 'copy':
          await vscode.env.clipboard.writeText(String(data.text ?? ''));
          vscode.window.setStatusBarMessage('$(check) Memory copied', 2000);
          break;
        case 'openChat':
          await vscode.commands.executeCommand('codiemind.chatPanel.focus');
          break;
        case 'refresh':
          await this._memory.refresh();
          break;
      }
    });
  }

  /**
   * Edit a stored memory. The evaluated backend has no update endpoint and is left unchanged, so an
   * edit stores the new version first and then deletes the old one. If storing fails, nothing is
   * deleted. The edited memory gets a new id and a fresh created_at, so it counts as new for recency.
   */
  private async _edit(data: { id?: unknown; content?: unknown; rationale?: unknown; importance?: unknown; category?: unknown }): Promise<void> {
    const reply = (ok: boolean, error?: string) =>
      void this._view?.webview.postMessage({ type: 'editResult', ok, error });
    const old = this._memory.find(String(data.id));
    const content = String(data.content ?? '').trim();
    const importance = Number(data.importance);
    if (!old) { reply(false, 'This memory no longer exists. Refresh the list.'); return; }
    if (!content || !Number.isInteger(importance) || importance < 1 || importance > 10) {
      reply(false, 'Invalid text or importance.');
      return;
    }
    let newId: string;
    try {
      if (old.kind === 'decision') {
        const rationale = String(data.rationale ?? '').trim();
        if (!rationale) { reply(false, 'A decision needs a reason.'); return; }
        newId = (await api.decide({ content, rationale, scope_type: old.scopeType, importance })).id;
      } else {
        newId = (await api.remember({
          content, importance, scope_type: old.scopeType, source: old.source,
          category: String(data.category ?? old.category),
        })).id;
      }
    } catch (err) {
      reply(false, `Could not save the change, the memory is unchanged. ${err instanceof Error ? err.message : err}`);
      return;
    }
    try {
      await api.forget(old.id);
    } catch (err) {
      vscode.window.showWarningMessage(
        `CodieMind: the edited memory was saved, but the old version could not be deleted. Delete it by hand. ${err instanceof Error ? err.message : err}`);
    }
    this._highlightId = newId;
    await this._memory.refresh(false);
    reply(true);
    vscode.window.setStatusBarMessage('$(check) Memory updated', 2000);
  }

  /** Reveal the panel and briefly highlight one memory (used by the chips under a reply). */
  public async reveal(id?: string): Promise<void> {
    this._highlightId = id ?? null;
    await vscode.commands.executeCommand(`${MemoryPanelProvider.viewType}.focus`);
    this._sendData();
  }

  private _sendData(): void {
    if (!this._view || !this._ready) { return; }
    void this._view.webview.postMessage({
      type: 'data',
      items: this._memory.items,
      connection: this._memory.connection,
      highlightId: this._highlightId,
    });
    this._highlightId = null;
  }

  private _getHtml(webview: vscode.Webview): string {
    return webviewHtml(webview, this._extensionUri, {
      styles: ['memory.css'],
      scripts: ['memory.js'],
      body: `
  <div class="toolbar">
    <div class="search">
      <span class="codicon codicon-search"></span>
      <input id="search" type="text" placeholder="Search memories" aria-label="Search memories">
    </div>
    <div class="segmented" role="tablist" id="tabs">
      <button role="tab" data-kind="all" class="active">All <span class="count" id="count-all">0</span></button>
      <button role="tab" data-kind="preference">Preferences <span class="count" id="count-preference">0</span></button>
      <button role="tab" data-kind="decision">Decisions <span class="count" id="count-decision">0</span></button>
    </div>
  </div>
  <div class="offline" id="offline" hidden>
    <span class="codicon codicon-debug-disconnect"></span>
    <span>Backend offline. Showing the last loaded memories.</span>
    <button class="link-btn" id="retry">Retry</button>
  </div>
  <main class="list" id="list" aria-live="polite"></main>`,
    });
  }
}
