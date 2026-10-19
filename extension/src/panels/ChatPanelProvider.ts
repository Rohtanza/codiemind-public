import * as vscode from 'vscode';
import { ChatMessage, Preference, PreferenceCategory, PreferenceScope } from '../types';
import * as api from '../api/client';
import { parseCommand } from '../commands/commandParser';
import { generateId } from '../utils/helpers';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codiemind.chatPanel';

  private _view?: vscode.WebviewView;
  private _messages: ChatMessage[] = [];
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
        case 'sendMessage':
          await this._handleUserMessage(data.text);
          break;
        case 'confirmYes':
          await this._handleConfirmYes(data.preference, data.category, data.scope);
          break;
        case 'confirmNo':
          this._addSystemMessage('Preference discarded.');
          break;
        case 'confirmEdit':
          this._postMessage({ type: 'showEditForm', messageId: data.messageId, preference: data.preference, category: data.category, scope: data.scope });
          break;
        case 'saveEdit':
          await this._handleConfirmYes(data.preference, data.category, data.scope);
          break;
      }
    });
  }

  private async _handleUserMessage(text: string): Promise<void> {
    const userMsg: ChatMessage = {
      id: generateId(),
      type: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    this._messages.push(userMsg);
    this._postMessage({ type: 'addMessage', message: userMsg });
    this._postMessage({ type: 'showTyping' });

    try {
      const parsed = parseCommand(text);
      switch (parsed.type) {
        case 'remember':
          await this._handleRemember(parsed.text, parsed.scope || 'project');
          break;
        case 'decide':
          await this._handleDecide(parsed.text, parsed.rationale);
          break;
        case 'forget':
          await this._handleForget(parsed.text);
          break;
        case 'memories':
          await this._handleMemories();
          break;
        case 'context':
          await this._handleContext();
          break;
        case 'chat':
          await this._handleChat(text);
          break;
      }
    } catch (err: any) {
      this._postMessage({ type: 'hideTyping' });
      this._addSystemMessage(`Error: ${err.message || err}`);
    }
  }

  private async _handleRemember(content: string, scope: string): Promise<void> {
    const resp = await api.remember({ content, scope_type: scope, category: 'style' });
    this._postMessage({ type: 'hideTyping' });
    this._addSystemMessage(
      `✓ Preference stored: ${resp.content} [${resp.category} · ${resp.scope_type} · ★${resp.importance}/10]`
    );
    this._onDidUpdateMemoryCount.fire(0);
  }

  private async _handleDecide(content: string, rationale?: string): Promise<void> {
    const resp = await api.decide({ content, rationale: rationale || content });
    this._postMessage({ type: 'hideTyping' });
    let msg = `✓ Decision stored: ${resp.content}`;
    if (resp.rationale) { msg += `\nRationale: ${resp.rationale}`; }
    msg += `\n[architecture · ${resp.scope_type} · ★${resp.importance}/10]`;
    this._addSystemMessage(msg);
    this._onDidUpdateMemoryCount.fire(0);
  }

  private async _handleForget(keyword: string): Promise<void> {
    const memories = await api.listMemories('project');
    const allItems = [
      ...memories.preferences.map(p => ({ id: p.id, content: p.content, kind: 'preference' })),
      ...memories.decisions.map(d => ({ id: d.id, content: d.content, kind: 'decision' })),
    ];
    const match = allItems.find(item => item.content.toLowerCase().includes(keyword.toLowerCase()));

    this._postMessage({ type: 'hideTyping' });
    if (!match) {
      this._addSystemMessage('No matching preference found.');
      return;
    }
    const resp = await api.forget(match.id);
    if (resp.deleted) {
      this._addSystemMessage(`✓ Deleted: '${match.content}'`);
      this._onDidUpdateMemoryCount.fire(0);
    } else {
      this._addSystemMessage('No matching preference found.');
    }
  }

  private async _handleMemories(): Promise<void> {
    const memories = await api.listMemories('project');
    this._postMessage({ type: 'hideTyping' });

    const allMemories: Preference[] = [
      ...memories.preferences.map(p => ({
        id: p.id,
        content: p.content,
        category: p.category as PreferenceCategory,
        scopeType: p.scope_type as PreferenceScope,
        scopePath: null,
        importance: p.importance,
        source: p.source as 'explicit' | 'implicit',
        createdAt: p.created_at,
        updatedAt: p.created_at,
        accessCount: 0
      })),
      ...memories.decisions.map(d => ({
        id: d.id,
        content: d.content,
        category: 'architecture' as PreferenceCategory,
        scopeType: d.scope_type as PreferenceScope,
        scopePath: null,
        importance: d.importance,
        source: 'explicit' as const,
        createdAt: d.created_at,
        updatedAt: d.created_at,
        accessCount: 0
      }))
    ];

    if (allMemories.length === 0) {
      this._addSystemMessage('No preferences stored yet. Use @remember to add one.');
      return;
    }

    const msg: ChatMessage = {
      id: generateId(),
      type: 'memories',
      text: 'Stored Memories',
      timestamp: new Date().toISOString(),
      memories: allMemories
    };
    this._messages.push(msg);
    this._postMessage({ type: 'addMessage', message: msg });
  }

  private async _handleContext(): Promise<void> {
    try {
      const breakdown = await api.getLastContext();
      this._postMessage({ type: 'hideTyping' });

      const msg: ChatMessage = {
        id: generateId(),
        type: 'context',
        text: 'Context Assembly for Last Query',
        timestamp: new Date().toISOString(),
        contextSlots: breakdown.slots.map((s, i) => ({
          slot: i + 1,
          name: s.name,
          tokens: s.tokens,
          content: s.content
        }))
      };
      this._messages.push(msg);
      this._postMessage({ type: 'addMessage', message: msg });
    } catch (err: any) {
      this._postMessage({ type: 'hideTyping' });
      if (err.status === 404) {
        this._addSystemMessage('No chat has been processed yet. Send a message first, then use @context.');
      } else {
        throw err;
      }
    }
  }

  private async _handleChat(text: string): Promise<void> {
    const resp = await api.chat({ query: text });
    this._postMessage({ type: 'hideTyping' });

    const appliedPrefs = resp.applied_preference_ids.map(id => ({
      content: `Preference ${id.substring(0, 8)}...`,
      category: 'style' as PreferenceCategory
    }));

    const assistantMsg: ChatMessage = {
      id: generateId(),
      type: 'assistant',
      text: resp.text,
      timestamp: new Date().toISOString(),
      appliedPreferences: appliedPrefs.length > 0 ? appliedPrefs : undefined,
    };
    this._messages.push(assistantMsg);
    this._postMessage({ type: 'addMessage', message: assistantMsg });
  }

  private async _handleConfirmYes(preferenceText: string, category: PreferenceCategory, scope: PreferenceScope): Promise<void> {
    try {
      const resp = await api.remember({
        content: preferenceText,
        category,
        scope_type: scope,
        importance: 5,
        source: 'implicit'
      });
      this._addSystemMessage(`✓ Preference stored: ${preferenceText} [${category} · ${scope} · ★5/10]`);
      this._onDidUpdateMemoryCount.fire(0);
    } catch (err: any) {
      this._addSystemMessage(`Error storing preference: ${err.message || err}`);
    }
  }

  private _addSystemMessage(text: string): void {
    const msg: ChatMessage = {
      id: generateId(),
      type: 'system',
      text,
      timestamp: new Date().toISOString()
    };
    this._messages.push(msg);
    this._postMessage({ type: 'addMessage', message: msg });
  }

  private _postMessage(message: unknown): void {
    this._view?.webview.postMessage(message);
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.html = this._getHtml(this._view.webview);
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css'));

    return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div class="chat-header">CodieMind Chat</div>
  <div class="messages-container" id="messages">
    ${this._getWelcomeHtml()}
  </div>
  <div class="input-area">
    <textarea id="message-input" rows="1" placeholder="Type a message or @command..."></textarea>
    <button id="send-btn" disabled>Send ▶</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    let isLoading = false;

    // ── Input Behavior ──
    inputEl.addEventListener('input', () => {
      sendBtn.disabled = inputEl.value.trim() === '' || isLoading;
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (inputEl.value.trim() && !isLoading) {
          sendMessage();
        }
      }
    });

    sendBtn.addEventListener('click', () => {
      if (inputEl.value.trim() && !isLoading) {
        sendMessage();
      }
    });

    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'sendMessage', text });
      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;
    }

    // ── Message Handling from Extension ──
    window.addEventListener('message', (event) => {
      const data = event.data;
      switch (data.type) {
        case 'addMessage':
          removeWelcome();
          appendMessage(data.message);
          break;
        case 'showTyping':
          showTypingIndicator();
          break;
        case 'hideTyping':
          hideTypingIndicator();
          break;
        case 'clearMessages':
          messagesEl.innerHTML = '';
          break;
        case 'showEditForm':
          showEditForm(data.messageId, data.preference, data.category, data.scope);
          break;
      }
    });

    function removeWelcome() {
      const welcome = document.querySelector('.welcome-message');
      if (welcome) welcome.remove();
    }

    // ── Render Messages ──
    function appendMessage(msg) {
      const div = document.createElement('div');
      div.id = 'msg-' + msg.id;

      switch (msg.type) {
        case 'user':
          div.className = 'message message-user';
          div.innerHTML = escapeHtml(msg.text) + renderTimestamp(msg.timestamp);
          break;

        case 'assistant':
          div.className = 'message message-assistant';
          div.innerHTML = renderMarkdown(msg.text)
            + renderPreferenceTags(msg.appliedPreferences)
            + renderTimestamp(msg.timestamp);
          break;

        case 'system':
          div.className = 'message message-system';
          div.innerHTML = escapeHtml(msg.text).replace(/\\n/g, '<br>');
          break;

        case 'confirmation':
          div.className = 'message message-confirmation';
          div.innerHTML = renderConfirmation(msg);
          break;

        case 'memories':
          div.className = 'message message-memories';
          div.innerHTML = renderMemories(msg);
          break;

        case 'context':
          div.className = 'message message-context';
          div.innerHTML = renderContext(msg);
          break;
      }

      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      setLoading(false);
    }

    function setLoading(loading) {
      isLoading = loading;
      inputEl.disabled = loading;
      sendBtn.disabled = loading || inputEl.value.trim() === '';
      if (!loading) inputEl.focus();
    }

    function showTypingIndicator() {
      setLoading(true);
      const existing = document.getElementById('typing-indicator');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.id = 'typing-indicator';
      div.className = 'typing-indicator';
      div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTypingIndicator() {
      const el = document.getElementById('typing-indicator');
      if (el) el.remove();
    }

    // ── Rendering Helpers ──
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function renderTimestamp(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return '<div class="message-timestamp">' + d.toLocaleTimeString() + '</div>';
    }

    function renderMarkdown(text) {
      const codeBlockRegex = /\`\`\`(\\w+)?\\n([\\s\\S]*?)\`\`\`/g;
      let html = '';
      let lastIndex = 0;
      let match;

      while ((match = codeBlockRegex.exec(text)) !== null) {
        const before = text.slice(lastIndex, match.index).trim();
        if (before) {
          html += '<p>' + escapeHtml(before).replace(/\\n/g, '<br>') + '</p>';
        }

        const lang = match[1] || '';
        const code = match[2].replace(/\\n$/, '');
        html += renderCodeBlock(code, lang);
        lastIndex = match.index + match[0].length;
      }

      const remaining = text.slice(lastIndex).trim();
      if (remaining) {
        html += '<p>' + escapeHtml(remaining).replace(/\\n/g, '<br>') + '</p>';
      }

      return html;
    }

    function renderCodeBlock(code, lang) {
      const id = 'code-' + Math.random().toString(36).substr(2, 9);
      return '<div class="code-block-wrapper">'
        + '<div class="code-block-header">'
        + '<span>' + escapeHtml(lang) + '</span>'
        + '<button class="copy-btn" onclick="copyCode(\\'' + id + '\\')">Copy</button>'
        + '</div>'
        + '<pre><code id="' + id + '">' + escapeHtml(code) + '</code></pre>'
        + '</div>';
    }

    function renderPreferenceTags(prefs) {
      if (!prefs || prefs.length === 0) return '';
      let html = '<div class="preference-tags">';
      for (const p of prefs) {
        const truncated = p.content.length > 30 ? p.content.slice(0, 27) + '...' : p.content;
        html += '<span class="preference-tag category-' + p.category + '">● ' + escapeHtml(truncated) + '</span>';
      }
      html += '</div>';
      return html;
    }

    function renderConfirmation(msg) {
      let html = '<p>' + escapeHtml(msg.text) + '</p>';
      html += '<div class="detected-pref-box">"' + escapeHtml(msg.detectedPreference) + '"</div>';
      html += '<div class="confirmation-meta">';
      html += '<span class="preference-tag category-' + msg.suggestedCategory + '">' + msg.suggestedCategory + '</span>';
      html += '<span class="preference-tag" style="background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);">' + msg.suggestedScope + '</span>';
      html += '</div>';
      html += '<div class="confirmation-actions" id="confirm-actions-' + msg.id + '">';
      html += '<button class="confirm-btn confirm-yes" onclick="handleConfirm(\\'' + msg.id + '\\', \\'yes\\', \\'' + escapeAttr(msg.detectedPreference) + '\\', \\'' + msg.suggestedCategory + '\\', \\'' + msg.suggestedScope + '\\')">✓ Yes</button>';
      html += '<button class="confirm-btn confirm-edit" onclick="handleConfirm(\\'' + msg.id + '\\', \\'edit\\', \\'' + escapeAttr(msg.detectedPreference) + '\\', \\'' + msg.suggestedCategory + '\\', \\'' + msg.suggestedScope + '\\')">✏ Edit</button>';
      html += '<button class="confirm-btn confirm-no" onclick="handleConfirm(\\'' + msg.id + '\\', \\'no\\', \\'\\', \\'\\', \\'\\')">✕ No</button>';
      html += '</div>';
      html += '<div id="edit-form-' + msg.id + '"></div>';
      return html;
    }

    function escapeAttr(str) {
      return str.replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
    }

    function handleConfirm(msgId, action, pref, category, scope) {
      const actionsEl = document.getElementById('confirm-actions-' + msgId);
      if (action === 'yes') {
        if (actionsEl) actionsEl.style.display = 'none';
        vscode.postMessage({ type: 'confirmYes', preference: pref, category: category, scope: scope });
      } else if (action === 'no') {
        if (actionsEl) actionsEl.style.display = 'none';
        vscode.postMessage({ type: 'confirmNo' });
      } else if (action === 'edit') {
        if (actionsEl) actionsEl.style.display = 'none';
        showEditForm(msgId, pref, category, scope);
      }
    }

    function showEditForm(msgId, pref, category, scope) {
      const formEl = document.getElementById('edit-form-' + msgId);
      if (!formEl) return;

      formEl.innerHTML = '<div class="edit-form">'
        + '<textarea id="edit-text-' + msgId + '">' + escapeHtml(pref) + '</textarea>'
        + '<select id="edit-scope-' + msgId + '">'
        + '<option value="project"' + (scope === 'project' ? ' selected' : '') + '>Project</option>'
        + '<option value="folder"' + (scope === 'folder' ? ' selected' : '') + '>Folder</option>'
        + '<option value="file"' + (scope === 'file' ? ' selected' : '') + '>File</option>'
        + '<option value="global"' + (scope === 'global' ? ' selected' : '') + '>Global</option>'
        + '</select>'
        + '<div class="edit-form-actions">'
        + '<button class="confirm-btn confirm-yes" onclick="saveEditedPref(\\'' + msgId + '\\', \\'' + category + '\\')">Save</button>'
        + '<button class="confirm-btn confirm-no" onclick="cancelEdit(\\'' + msgId + '\\')">Cancel</button>'
        + '</div></div>';
    }

    function saveEditedPref(msgId, category) {
      const textEl = document.getElementById('edit-text-' + msgId);
      const scopeEl = document.getElementById('edit-scope-' + msgId);
      if (!textEl || !scopeEl) return;
      const formEl = document.getElementById('edit-form-' + msgId);
      if (formEl) formEl.innerHTML = '';
      vscode.postMessage({ type: 'saveEdit', preference: textEl.value, category: category, scope: scopeEl.value });
    }

    function cancelEdit(msgId) {
      const formEl = document.getElementById('edit-form-' + msgId);
      if (formEl) formEl.innerHTML = '';
      const actionsEl = document.getElementById('confirm-actions-' + msgId);
      if (actionsEl) actionsEl.style.display = 'flex';
    }

    function renderMemories(msg) {
      if (!msg.memories || msg.memories.length === 0) {
        return '<p>No preferences stored yet. Use @remember to add one.</p>';
      }

      const grouped = { project: [], folder: [], file: [], global: [] };
      for (const m of msg.memories) {
        grouped[m.scopeType].push(m);
      }

      let html = '<div class="memories-header">Stored Memories (' + msg.memories.length + ' total)</div>';

      const scopeLabels = {
        project: 'Project Scope',
        folder: 'Folder Scope',
        file: 'File Scope',
        global: 'Global Scope'
      };

      for (const [scope, items] of Object.entries(grouped)) {
        if (items.length === 0) continue;
        html += '<div class="memory-group-header">' + scopeLabels[scope] + '</div>';
        for (const m of items) {
          const isDecision = m.id.startsWith('dec-');
          html += '<div class="memory-card' + (isDecision ? ' decision' : '') + '">';
          html += '<span class="memory-card-category category-' + m.category + '">' + m.category + '</span>';
          if (isDecision) html += '<span class="memory-card-label">DECISION</span>';
          html += '<div class="memory-card-content">' + escapeHtml(m.content) + '</div>';
          html += '<div class="memory-card-meta">' + m.scopeType + (m.scopePath ? ':' + m.scopePath : '')
            + ' · ★' + m.importance + '/10 · ' + m.source + ' · ' + formatDate(m.createdAt) + '</div>';
          html += '</div>';
        }
      }

      return html;
    }

    function renderContext(msg) {
      if (!msg.contextSlots) return '';
      const totalTokens = msg.contextSlots.reduce((sum, s) => sum + s.tokens, 0);

      let html = '<div class="context-header">Context Assembly for Last Query</div>';
      for (const slot of msg.contextSlots) {
        const pct = totalTokens > 0 ? Math.round((slot.tokens / totalTokens) * 100) : 0;
        html += '<div class="context-slot">';
        html += '<div class="context-slot-header">';
        html += '<span class="context-slot-name">Slot ' + slot.slot + ': ' + escapeHtml(slot.name) + '</span>';
        html += '<span class="context-slot-tokens">' + slot.tokens + ' tokens</span>';
        html += '</div>';
        html += '<div class="context-progress-bar"><div class="context-progress-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="context-slot-content">' + escapeHtml(slot.content) + '</div>';
        html += '</div>';
      }

      const budgetLimit = 4096;
      const pctTotal = Math.round((totalTokens / budgetLimit) * 100);
      html += '<div class="context-footer">Total: ' + totalTokens + '/' + budgetLimit + ' tokens (' + pctTotal + '% of budget)</div>';

      return html;
    }

    function formatDate(isoString) {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // ── Copy Code ──
    window.copyCode = function(id) {
      const codeEl = document.getElementById(id);
      if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent || '');
        const btn = codeEl.closest('.code-block-wrapper').querySelector('.copy-btn');
        if (btn) {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        }
      }
    };
  </script>
</body>
</html>`;
  }

  private _getWelcomeHtml(): string {
    return /*html*/`
    <div class="welcome-message">
      <div class="welcome-title">Welcome to CodieMind</div>
      <div class="welcome-desc">
        I'm your preference-aware coding assistant. I remember your coding
        preferences across sessions so you never have to repeat yourself.
      </div>
      <div class="welcome-commands">
        <span class="cmd">@remember</span> &lt;preference&gt; &nbsp;&nbsp;&nbsp; Store a coding preference<br>
        <span class="cmd">@decide</span> &lt;decision&gt; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Store an architectural decision<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; because &lt;reason&gt;<br>
        <span class="cmd">@forget</span> &lt;keyword&gt; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Remove a stored preference<br>
        <span class="cmd">@memories</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; View all stored preferences<br>
        <span class="cmd">@context</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; See how your last prompt was assembled
      </div>
      <div class="welcome-tip">
        Try it: Type <span class="cmd">@remember use arrow functions instead of function declarations</span> to get started.
      </div>
    </div>`;
  }
}
