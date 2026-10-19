import * as vscode from 'vscode';
import { PreferenceCategory } from '../types';
import * as api from '../api/client';

export class MemoryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codiemind.memoryPanel';

  private _view?: vscode.WebviewView;
  private _onDidUpdateMemoryCount: vscode.EventEmitter<number> = new vscode.EventEmitter<number>();
  public readonly onDidUpdateMemoryCount: vscode.Event<number> = this._onDidUpdateMemoryCount.event;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'delete': {
          try {
            const resp = await api.forget(data.id);
            if (resp.deleted) {
              this._onDidUpdateMemoryCount.fire(0);
              this.refresh();
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to delete: ${err.message || err}`);
          }
          break;
        }
        case 'update': {
          // The backend doesn't have an update endpoint in FYP-1.
          // For now, show a message that edit is not yet supported via backend.
          vscode.window.showInformationMessage('Inline editing will be available in a future update. Use @forget and @remember to update preferences.');
          break;
        }
        case 'requestData':
          await this._sendData(null);
          break;
      }
    });

    this._sendData(null);
  }

  public refresh(): void {
    this._sendData(null);
  }

  private async _sendData(flashId: string | null): Promise<void> {
    try {
      const memories = await api.listMemories('project');

      const allItems = [
        ...memories.preferences.map(p => ({
          id: p.id,
          content: p.content,
          category: p.category as PreferenceCategory,
          scopeType: p.scope_type,
          scopePath: null as string | null,
          importance: p.importance,
          source: p.source,
          createdAt: p.created_at,
          updatedAt: p.created_at,
          accessCount: 0,
          isDecision: false,
          rationale: null as string | null,
        })),
        ...memories.decisions.map(d => ({
          id: d.id,
          content: d.content,
          category: 'architecture' as PreferenceCategory,
          scopeType: d.scope_type,
          scopePath: null as string | null,
          importance: d.importance,
          source: 'explicit' as const,
          createdAt: d.created_at,
          updatedAt: d.created_at,
          accessCount: 0,
          isDecision: true,
          rationale: d.rationale,
        }))
      ];

      this._postMessage({ type: 'updateData', items: allItems, count: allItems.length, flashId });
    } catch (err: any) {
      this._postMessage({ type: 'updateData', items: [], count: 0, flashId: null });
    }
  }

  private _postMessage(message: unknown): void {
    this._view?.webview.postMessage(message);
  }

  private _getHtml(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'memory.css'));

    return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div class="panel-header">
    <span class="panel-title">Stored Memories</span>
    <span class="count-badge" id="count-badge">0</span>
  </div>
  <div class="filter-bar">
    <label>Scope:</label>
    <select id="filter-scope">
      <option value="all">All</option>
      <option value="project">Project</option>
      <option value="folder">Folder</option>
      <option value="file">File</option>
      <option value="global">Global</option>
    </select>
    <label>Category:</label>
    <select id="filter-category">
      <option value="all">All</option>
      <option value="style">Style</option>
      <option value="architecture">Architecture</option>
      <option value="naming">Naming</option>
      <option value="tool">Tool</option>
      <option value="constraint">Constraint</option>
    </select>
  </div>
  <div class="cards-container" id="cards-container">
    <div class="empty-state">Loading...</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const cardsContainer = document.getElementById('cards-container');
    const countBadge = document.getElementById('count-badge');
    const filterScope = document.getElementById('filter-scope');
    const filterCategory = document.getElementById('filter-category');

    let allItems = [];

    filterScope.addEventListener('change', renderCards);
    filterCategory.addEventListener('change', renderCards);

    window.addEventListener('message', (event) => {
      const data = event.data;
      switch (data.type) {
        case 'updateData':
          allItems = data.items;
          countBadge.textContent = data.count;
          renderCards();
          if (data.flashId) {
            const card = document.getElementById('card-' + data.flashId);
            if (card) {
              const flash = document.createElement('div');
              flash.className = 'flash-updated';
              flash.textContent = 'Updated';
              card.appendChild(flash);
              setTimeout(() => flash.remove(), 1500);
            }
          }
          break;
      }
    });

    // Request initial data
    vscode.postMessage({ type: 'requestData' });

    function renderCards() {
      const scopeFilter = filterScope.value;
      const categoryFilter = filterCategory.value;

      let filtered = allItems.filter(item => {
        if (scopeFilter !== 'all' && item.scopeType !== scopeFilter) return false;
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        return true;
      });

      countBadge.textContent = filtered.length;

      if (filtered.length === 0) {
        const isFiltering = scopeFilter !== 'all' || categoryFilter !== 'all';
        cardsContainer.innerHTML = '<div class="empty-state">'
          + (isFiltering
            ? 'No preferences match the current filters.'
            : 'No preferences stored yet. Use @remember in the chat to add your first preference.')
          + '</div>';
        return;
      }

      // Group by scope
      const grouped = { project: [], folder: [], file: [], global: [] };
      for (const item of filtered) {
        if (grouped[item.scopeType]) {
          grouped[item.scopeType].push(item);
        }
      }

      let html = '';
      const scopeLabels = {
        project: 'Project Scope',
        folder: 'Folder Scope',
        file: 'File Scope',
        global: 'Global Scope'
      };

      for (const [scope, items] of Object.entries(grouped)) {
        if (items.length === 0) continue;
        const label = items[0].scopePath
          ? scopeLabels[scope].replace('Scope', ': ' + items[0].scopePath)
          : scopeLabels[scope];
        html += '<div class="group-header">' + escapeHtml(label) + '</div>';

        for (const item of items) {
          html += renderCard(item);
        }
      }

      cardsContainer.innerHTML = html;
    }

    function renderCard(item) {
      let html = '<div class="pref-card' + (item.isDecision ? ' decision' : '') + '" id="card-' + item.id + '">';
      html += '<div class="pref-card-top">';
      html += '<span class="category-badge category-' + item.category + '">' + item.category + '</span>';
      if (item.isDecision) html += '<span class="decision-label">DECISION</span>';
      html += '</div>';
      html += '<div class="pref-card-content" id="content-' + item.id + '">' + escapeHtml(item.content) + '</div>';
      if (item.rationale) {
        html += '<div class="pref-card-rationale">Rationale: ' + escapeHtml(item.rationale) + '</div>';
      }
      html += '<div class="pref-card-meta">'
        + item.scopeType + (item.scopePath ? ':' + item.scopePath : '')
        + ' · ★' + item.importance + '/10'
        + ' · ' + item.source
        + ' · ' + formatDate(item.createdAt)
        + '</div>';
      html += '<div class="pref-card-actions">';
      html += '<button class="card-btn card-btn-danger" onclick="startDelete(\\'' + item.id + '\\')">Delete</button>';
      html += '</div>';
      html += '<div id="confirm-' + item.id + '"></div>';
      html += '</div>';
      return html;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function formatDate(isoString) {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // ── Delete Flow ──
    window.startDelete = function(id) {
      const el = document.getElementById('confirm-' + id);
      if (!el) return;
      el.innerHTML = '<div class="delete-confirm">'
        + 'Delete this preference? '
        + '<button class="card-btn card-btn-danger" onclick="confirmDelete(\\'' + id + '\\')">Confirm</button>'
        + '<button class="card-btn" onclick="cancelDelete(\\'' + id + '\\')">Cancel</button>'
        + '</div>';
    };

    window.confirmDelete = function(id) {
      const card = document.getElementById('card-' + id);
      if (card) {
        card.classList.add('removing');
        setTimeout(() => {
          vscode.postMessage({ type: 'delete', id: id });
        }, 300);
      }
    };

    window.cancelDelete = function(id) {
      const el = document.getElementById('confirm-' + id);
      if (el) el.innerHTML = '';
    };
  </script>
</body>
</html>`;
  }
}
