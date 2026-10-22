// CodieMind chat panel (webview side). Renders messages sent by the extension host and keeps
// the conversation in webview state so it survives the panel being hidden or reloaded.
(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const md = window.CMMarkdown;
  const esc = md.escapeHtml;

  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const atBtn = document.getElementById('at-btn');
  const menuEl = document.getElementById('command-menu');
  const statusEl = document.getElementById('status');

  const saved = vscode.getState() || {};
  let messages = Array.isArray(saved.messages) ? saved.messages : [];
  let commands = [];
  let thinking = false;
  let menuIndex = 0;
  let menuItems = [];
  let connection = null;

  const STARTERS = [
    { icon: 'bookmark', title: 'Remember a preference', text: '@remember Always use arrow functions in TypeScript' },
    { icon: 'law', title: 'Record a decision', text: '@decide Use axios for HTTP requests because it supports interceptors' },
    { icon: 'code', title: 'Ask for code', text: 'Write a TypeScript function that fetches a user by id from /api/users' },
    { icon: 'layers', title: 'See the last prompt', text: '@context' },
  ];
  const SLOT_COLORS = ['#4f8fe8', '#1b891b', '#b26edc', '#d69628', '#e0605b', '#3fb6b0'];

  // ── State ─────────────────────────────────────────────────
  function save() {
    vscode.setState({ messages: messages.slice(-200), draft: inputEl.value });
  }

  function time(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }

  // ── Rendering ─────────────────────────────────────────────
  function renderAll() {
    messagesEl.innerHTML = '';
    if (messages.length === 0) {
      messagesEl.appendChild(welcome());
    } else {
      for (const m of messages) messagesEl.appendChild(renderMessage(m));
    }
    if (thinking) messagesEl.appendChild(thinkingEl(thinkingLabel));
    scrollToEnd();
  }

  function append(m) {
    const w = messagesEl.querySelector('.welcome');
    if (w) w.remove();
    const t = document.getElementById('thinking');
    const el = renderMessage(m);
    if (t) messagesEl.insertBefore(el, t); else messagesEl.appendChild(el);
    scrollToEnd();
  }

  function scrollToEnd() {
    requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function head(kind, name, ts) {
    const avatar = kind === 'user'
      ? '<span class="avatar user"><span class="codicon codicon-account"></span></span>'
      : '<span class="avatar bot"><span class="mark"></span></span>';
    return '<div class="turn-head">' + avatar + '<span class="who">' + name + '</span>'
      + (ts ? '<span class="time">' + time(ts) + '</span>' : '') + '</div>';
  }

  function renderMessage(m) {
    switch (m.role) {
      case 'user':
        return el('<section class="turn user">' + head('user', 'You', m.timestamp)
          + '<div class="turn-body md">' + md.render(m.text, []) + '</div></section>');
      case 'assistant':
        return el('<section class="turn assistant">' + head('bot', 'CodieMind', m.timestamp)
          + '<div class="turn-body md">' + md.render(m.text, m.usedMemories || []) + '</div>'
          + usedMemories(m.usedMemories || [])
          + '<div class="turn-actions"><button class="icon-btn" data-action="copy-reply" data-text="' + esc(m.text)
          + '" title="Copy reply" aria-label="Copy reply"><span class="codicon codicon-copy"></span></button></div>'
          + '</section>');
      case 'event':
        return el('<section class="turn assistant">' + head('bot', 'CodieMind', m.timestamp)
          + '<div class="turn-body">' + eventCard(m) + '</div></section>');
      case 'memories':
        return el('<section class="turn assistant">' + head('bot', 'CodieMind', m.timestamp)
          + '<div class="turn-body">' + memoriesCard(m.items) + '</div></section>');
      case 'context':
        return el('<section class="turn assistant">' + head('bot', 'CodieMind', m.timestamp)
          + '<div class="turn-body">' + contextCard(m.context) + '</div></section>');
      case 'help':
        return el('<section class="turn assistant">' + head('bot', 'CodieMind', m.timestamp)
          + '<div class="turn-body">' + helpCard() + '</div></section>');
      case 'notice':
        return el('<div class="notice ' + m.tone + '"><span class="codicon codicon-'
          + (m.tone === 'warning' ? 'warning' : 'info') + '"></span><span>' + esc(m.text) + '</span></div>');
      case 'error':
        return el('<div class="card error-card"><div class="card-title"><span class="codicon codicon-'
          + (m.offline ? 'debug-disconnect' : 'error') + '"></span>' + esc(m.title) + '</div>'
          + '<div class="card-detail">' + esc(m.detail) + '</div><div class="card-actions">'
          + (m.retryText ? '<button class="btn" data-action="retry" data-text="' + esc(m.retryText) + '"><span class="codicon codicon-refresh"></span>Retry</button>' : '')
          + (m.offline ? '<button class="btn secondary" data-action="check">Check connection</button>' : '')
          + '</div></div>');
      default:
        return el('<div></div>');
    }
  }

  function categoryChip(cat) {
    return '<span class="chip cat-' + esc(cat) + '">' + esc(cat) + '</span>';
  }

  function importance(n) {
    const v = Math.max(0, Math.min(10, Number(n) || 0));
    return '<span class="importance" title="Importance ' + v + ' of 10"><span class="bar"><i style="width:'
      + (v * 10) + '%"></i></span>' + v + '/10</span>';
  }

  function usedMemories(items) {
    if (!items.length) {
      return '<div class="used none"><span class="codicon codicon-info"></span>No stored memory was retrieved for this request</div>';
    }
    const cited = items.filter(i => i.cited).length;
    const chips = items.map(i => '<button class="mem-chip' + (i.cited ? ' cited' : '') + '" data-action="open-memory" data-id="' + esc(i.id)
      + '" title="' + esc((i.cited ? 'Applied and cited in the reply: ' : 'Retrieved into the prompt: ') + i.content) + '">'
      + '<span class="codicon codicon-' + (i.cited ? 'check' : (i.kind === 'decision' ? 'law' : 'bookmark'))
      + '"></span><span class="txt">' + esc(i.content) + '</span></button>').join('');
    const label = items.length + ' ' + (items.length === 1 ? 'memory' : 'memories') + ' in context'
      + (cited ? ' · ' + cited + ' cited' : '');
    return '<div class="used"><div class="used-label">' + label + '</div><div class="chips">' + chips + '</div></div>';
  }

  function eventCard(m) {
    const it = m.item;
    const cfg = {
      remembered: { icon: 'pass-filled', title: 'Preference saved', tone: 'ok' },
      decided: { icon: 'pass-filled', title: 'Decision recorded', tone: 'ok' },
      forgotten: { icon: 'trash', title: 'Memory removed', tone: 'muted' },
    }[m.kind];
    return '<div class="card event-card ' + cfg.tone + '"><div class="card-title"><span class="codicon codicon-' + cfg.icon
      + '"></span>' + cfg.title + '</div><blockquote class="quote">' + esc(it.content) + '</blockquote>'
      + (it.rationale && it.rationale !== it.content ? '<div class="rationale"><span>Because</span> ' + esc(it.rationale) + '</div>' : '')
      + (m.kind === 'forgotten' ? '' : '<div class="meta">' + categoryChip(it.category) + importance(it.importance)
        + '<span class="scope"><span class="codicon codicon-folder"></span>' + esc(it.scopeType) + '</span>'
        + '<button class="link-btn" data-action="open-memory" data-id="' + esc(it.id) + '">View in Memories</button></div>')
      + '</div>';
  }

  function memoriesCard(items) {
    if (!items.length) {
      return '<div class="card"><div class="card-title"><span class="codicon codicon-database"></span>No memories yet</div>'
        + '<div class="card-detail">Store one with <code>@remember</code> or <code>@decide</code>.</div></div>';
    }
    const group = (kind, label) => {
      const list = items.filter(i => i.kind === kind);
      if (!list.length) return '';
      return '<div class="group-label">' + label + ' <span class="count">' + list.length + '</span></div>'
        + list.map(i => '<div class="mem-row"><span class="codicon codicon-' + (kind === 'decision' ? 'law' : 'bookmark')
          + '"></span><span class="mem-text">' + esc(i.content) + '</span>' + categoryChip(i.category) + '</div>').join('');
    };
    return '<div class="card"><div class="card-title"><span class="codicon codicon-database"></span>Stored memories'
      + ' <span class="count">' + items.length + '</span></div>' + group('preference', 'Preferences') + group('decision', 'Decisions')
      + '<div class="card-actions"><button class="btn secondary" data-action="open-memory"><span class="codicon codicon-link-external"></span>Open Memories view</button></div></div>';
  }

  function contextCard(c) {
    const total = c.totalTokens || c.slots.reduce((a, s) => a + s.tokens, 0);
    const budget = c.budget || total || 1;
    const bar = c.slots.map((s, i) => s.tokens > 0
      ? '<i style="width:' + (100 * s.tokens / budget).toFixed(2) + '%;background:' + SLOT_COLORS[i % 6] + '" title="'
        + esc(s.name) + ': ' + s.tokens + ' tokens"></i>' : '').join('');
    const rows = c.slots.map((s, i) => '<details class="slot' + (s.tokens ? '' : ' empty') + '"><summary>'
      + '<span class="swatch" style="background:' + SLOT_COLORS[i % 6] + '"></span><span class="slot-name">'
      + (i + 1) + '. ' + esc(s.name) + '</span><span class="slot-tokens">' + s.tokens.toLocaleString() + '</span>'
      + '<span class="codicon codicon-chevron-right chev"></span></summary><pre class="slot-content">'
      + esc(s.content || '(empty)') + '</pre></details>').join('');
    return '<div class="card context-card"><div class="card-title"><span class="codicon codicon-layers"></span>Prompt assembly</div>'
      + '<div class="card-detail ellipsis">For: ' + esc(c.query) + '</div>'
      + '<div class="token-bar" role="img" aria-label="' + total + ' of ' + budget + ' tokens used">' + bar + '</div>'
      + '<div class="token-total"><strong>' + total.toLocaleString() + '</strong> of ' + budget.toLocaleString()
      + ' tokens · ' + Math.round(100 * total / budget) + '% of budget</div><div class="slots">' + rows + '</div></div>';
  }

  function helpCard() {
    const rows = commands.map(c => '<div class="help-row"><code>' + esc(c.name) + '</code><span class="args">' + esc(c.args)
      + '</span><span class="desc">' + esc(c.description) + '</span></div>').join('');
    return '<div class="card"><div class="card-title"><span class="codicon codicon-question"></span>What CodieMind can do</div>'
      + '<div class="help">' + rows + '</div><div class="card-detail">Any other message is a coding question. Your stored '
      + 'preferences and decisions are retrieved and added to the prompt. Select code in the editor and choose '
      + '<strong>Ask CodieMind About Selection</strong> from the right-click menu to ask about it.</div></div>';
  }

  function welcome() {
    const offline = connection && !connection.connected;
    return el('<div class="welcome"><div class="welcome-mark"></div><h1>CodieMind</h1>'
      + '<p class="lead">Your coding preferences and project decisions, remembered across sessions and applied to every answer.</p>'
      + (offline ? '<div class="notice warning"><span class="codicon codicon-debug-disconnect"></span><span>Backend offline. '
        + 'Start it in <code>codiemind/backend</code>: <code>uv run uvicorn app.main:app</code></span></div>' : '')
      + '<div class="starters">' + STARTERS.map(s => '<button class="starter" data-action="starter" data-text="' + esc(s.text)
        + '"><span class="codicon codicon-' + s.icon + '"></span><span class="starter-title">' + esc(s.title)
        + '</span><span class="starter-text">' + esc(s.text) + '</span></button>').join('') + '</div>'
      + '<p class="foot"><span class="codicon codicon-lightbulb"></span>Select code, right-click, and choose '
      + '<strong>Ask CodieMind About Selection</strong>.</p></div>');
  }

  let thinkingLabel = 'Thinking';
  function thinkingEl(label) {
    return el('<section class="turn assistant" id="thinking">' + head('bot', 'CodieMind', null)
      + '<div class="thinking"><span class="spinner"></span><span class="shimmer">' + esc(label) + '</span></div></section>');
  }

  function setThinking(on, label) {
    thinking = on;
    thinkingLabel = label || 'Thinking';
    const t = document.getElementById('thinking');
    if (t) t.remove();
    if (on) { messagesEl.appendChild(thinkingEl(thinkingLabel)); scrollToEnd(); }
    updateSend();
  }

  function setConnection(state) {
    connection = state;
    statusEl.classList.toggle('ok', !!state.connected);
    statusEl.classList.toggle('off', !state.connected);
    statusEl.querySelector('.label').textContent = state.connected ? (state.chatModel || 'Connected') : 'Offline';
    statusEl.title = state.connected
      ? 'Connected to ' + state.url + (state.chatModel ? ' · model ' + state.chatModel : '')
      : 'Cannot reach ' + state.url + '. Click to check again.';
    if (messages.length === 0) renderAll();
  }

  // ── Sending ───────────────────────────────────────────────
  function updateSend() {
    sendBtn.disabled = thinking || inputEl.value.trim() === '';
  }

  function autosize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + 'px';
  }

  function addUser(text) {
    const m = { id: 'u' + Date.now(), role: 'user', text, timestamp: new Date().toISOString() };
    messages.push(m);
    append(m);
    save();
  }

  function send(text) {
    const t = (text != null ? text : inputEl.value).trim();
    if (!t || thinking) return;
    addUser(t);
    vscode.postMessage({ type: 'send', text: t });
    if (text == null) { inputEl.value = ''; autosize(); }
    hideMenu();
    updateSend();
    save();
  }

  // ── Command menu ──────────────────────────────────────────
  function showMenu(filter) {
    const f = (filter || '').toLowerCase();
    menuItems = commands.filter(c => c.name.startsWith(f));
    if (!menuItems.length) { hideMenu(); return; }
    menuIndex = Math.min(menuIndex, menuItems.length - 1);
    menuEl.innerHTML = menuItems.map((c, i) => '<div class="cmd' + (i === menuIndex ? ' active' : '') + '" role="option" data-index="' + i
      + '"><span class="cmd-name">' + esc(c.name) + '</span><span class="cmd-args">' + esc(c.args)
      + '</span><span class="cmd-desc">' + esc(c.description) + '</span></div>').join('');
    menuEl.hidden = false;
  }

  function hideMenu() { menuEl.hidden = true; menuIndex = 0; }

  function pickCommand(i) {
    const c = menuItems[i];
    if (!c) return;
    inputEl.value = c.name + (c.args ? ' ' : '');
    hideMenu();
    inputEl.focus();
    autosize();
    updateSend();
    if (!c.args) send();
  }

  function menuFilter() {
    const v = inputEl.value;
    return /^@\S*$/.test(v) ? v : null;
  }

  inputEl.addEventListener('input', () => {
    autosize();
    updateSend();
    const f = menuFilter();
    if (f !== null) { menuIndex = 0; showMenu(f); } else hideMenu();
    save();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (!menuEl.hidden) {
      if (e.key === 'ArrowDown') { e.preventDefault(); menuIndex = (menuIndex + 1) % menuItems.length; showMenu(menuFilter() || '@'); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length; showMenu(menuFilter() || '@'); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickCommand(menuIndex); return; }
      if (e.key === 'Escape') { e.preventDefault(); hideMenu(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });

  menuEl.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.cmd');
    if (item) { e.preventDefault(); pickCommand(Number(item.dataset.index)); }
  });

  sendBtn.addEventListener('click', () => send());
  atBtn.addEventListener('click', () => {
    inputEl.value = '@';
    inputEl.focus();
    menuIndex = 0;
    showMenu('@');
    updateSend();
  });
  statusEl.addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));

  // ── Delegated clicks inside messages ──────────────────────
  messagesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'starter') {
      const text = btn.dataset.text;
      if (text === '@context') { send(text); return; }
      inputEl.value = text;
      inputEl.focus();
      autosize();
      updateSend();
      return;
    }
    if (action === 'retry') { send(btn.dataset.text); return; }
    if (action === 'check') { vscode.postMessage({ type: 'checkConnection' }); return; }
    if (action === 'open-memory') { vscode.postMessage({ type: 'openMemories', id: btn.dataset.id }); return; }
    if (action === 'copy-reply') { vscode.postMessage({ type: 'copy', text: btn.dataset.text }); flash(btn); return; }
    const blockEl = btn.closest('.code-block');
    const block = blockEl && md.blocks.get(blockEl.dataset.block);
    if (!block) return;
    if (action === 'copy') { vscode.postMessage({ type: 'copy', text: block.code }); flash(btn); }
    if (action === 'insert') vscode.postMessage({ type: 'insertCode', code: block.code });
    if (action === 'newfile') vscode.postMessage({ type: 'newFile', code: block.code, lang: block.lang });
  });

  function flash(btn) {
    const icon = btn.querySelector('.codicon');
    if (!icon) return;
    icon.classList.replace('codicon-copy', 'codicon-check');
    btn.classList.add('done');
    setTimeout(() => { icon.classList.replace('codicon-check', 'codicon-copy'); btn.classList.remove('done'); }, 1400);
  }

  // ── Messages from the extension host ──────────────────────
  window.addEventListener('message', (event) => {
    const data = event.data;
    switch (data.type) {
      case 'init':
        commands = data.commands || [];
        setConnection(data.state);
        break;
      case 'connection':
        setConnection(data.state);
        break;
      case 'message':
        messages.push(data.message);
        append(data.message);
        save();
        break;
      case 'echoUser':
        addUser(data.text);
        break;
      case 'thinking':
        setThinking(!!data.on, data.label);
        break;
      case 'reset':
        messages = [];
        setThinking(false);
        save();
        renderAll();
        inputEl.focus();
        break;
    }
  });

  // ── Start ─────────────────────────────────────────────────
  inputEl.value = saved.draft || '';
  autosize();
  renderAll();
  updateSend();
  vscode.postMessage({ type: 'ready' });
})();
