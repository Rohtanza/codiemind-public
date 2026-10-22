// CodieMind memory panel (webview side): search, filter and delete stored memories.
(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const listEl = document.getElementById('list');
  const searchEl = document.getElementById('search');
  const tabsEl = document.getElementById('tabs');
  const offlineEl = document.getElementById('offline');

  const saved = vscode.getState() || {};
  let items = [];
  let loaded = false;
  let kind = saved.kind || 'all';
  searchEl.value = saved.query || '';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ago(iso) {
    const t = new Date(iso).getTime();
    if (!t) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [u, n] of units) {
      const v = Math.floor(s / n);
      if (v >= 1) return v + ' ' + u + (v > 1 ? 's' : '') + ' ago';
    }
    return '';
  }

  function save() { vscode.setState({ kind, query: searchEl.value }); }

  function render(highlightId) {
    const q = searchEl.value.trim().toLowerCase();
    const counts = { all: items.length, preference: 0, decision: 0 };
    for (const i of items) counts[i.kind]++;
    for (const k of Object.keys(counts)) document.getElementById('count-' + k).textContent = counts[k];
    tabsEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.kind === kind));

    const shown = items
      .filter(i => kind === 'all' || i.kind === kind)
      .filter(i => !q || i.content.toLowerCase().includes(q) || (i.rationale || '').toLowerCase().includes(q) || i.category.includes(q))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (!loaded) { listEl.innerHTML = '<div class="empty"><span class="spinner"></span></div>'; return; }
    if (items.length === 0) {
      listEl.innerHTML = '<div class="empty"><div class="empty-mark"></div><h2>No memories yet</h2>'
        + '<p>Tell CodieMind how you like your code. It will remember across sessions.</p>'
        + '<p class="examples"><code>@remember Always use arrow functions</code><br><code>@decide Use axios because it supports interceptors</code></p>'
        + '<button class="btn" data-action="open-chat"><span class="codicon codicon-comment-discussion"></span>Open chat</button></div>';
      return;
    }
    if (shown.length === 0) {
      listEl.innerHTML = '<div class="empty small"><span class="codicon codicon-search"></span><p>No memories match your search.</p></div>';
      return;
    }

    listEl.innerHTML = shown.map(card).join('');
    if (highlightId) {
      const c = document.getElementById('m-' + highlightId);
      if (c) {
        c.scrollIntoView({ block: 'center' });
        c.classList.add('flash');
        setTimeout(() => c.classList.remove('flash'), 1800);
      }
    }
  }

  function card(i) {
    const v = Math.max(0, Math.min(10, Number(i.importance) || 0));
    const isDec = i.kind === 'decision';
    return '<article class="mem-card' + (isDec ? ' decision' : '') + '" id="m-' + esc(i.id) + '">'
      + '<div class="mem-icon"><span class="codicon codicon-' + (isDec ? 'law' : 'bookmark') + '"></span></div>'
      + '<div class="mem-main">'
      + '<div class="mem-kind">' + (isDec ? 'Decision' : 'Preference') + '</div>'
      + '<div class="mem-content">' + esc(i.content) + '</div>'
      + (i.rationale && i.rationale !== i.content ? '<div class="mem-rationale"><span>Because</span> ' + esc(i.rationale) + '</div>' : '')
      + '<div class="mem-meta"><span class="chip cat-' + esc(i.category) + '">' + esc(i.category) + '</span>'
      + '<span class="importance" title="Importance ' + v + ' of 10"><span class="bar"><i style="width:' + v * 10 + '%"></i></span>' + v + '/10</span>'
      + '<span class="ago" title="' + esc(new Date(i.createdAt).toLocaleString()) + '">' + ago(i.createdAt) + '</span></div>'
      + '<div class="confirm" hidden><span>Delete this memory?</span>'
      + '<button class="btn danger" data-action="confirm-delete" data-id="' + esc(i.id) + '">Delete</button>'
      + '<button class="btn secondary" data-action="cancel-delete">Cancel</button></div>'
      + '</div>'
      + '<div class="mem-actions">'
      + '<button class="icon-btn" data-action="copy" data-text="' + esc(i.content) + '" title="Copy" aria-label="Copy"><span class="codicon codicon-copy"></span></button>'
      + '<button class="icon-btn" data-action="delete" title="Delete" aria-label="Delete"><span class="codicon codicon-trash"></span></button>'
      + '</div></article>';
  }

  searchEl.addEventListener('input', () => { render(); save(); });
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    kind = b.dataset.kind;
    render();
    save();
  });
  document.getElementById('retry').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));

  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const cardEl = b.closest('.mem-card');
    switch (b.dataset.action) {
      case 'copy': vscode.postMessage({ type: 'copy', text: b.dataset.text }); break;
      case 'delete': cardEl.querySelector('.confirm').hidden = false; break;
      case 'cancel-delete': cardEl.querySelector('.confirm').hidden = true; break;
      case 'confirm-delete':
        cardEl.classList.add('removing');
        setTimeout(() => vscode.postMessage({ type: 'delete', id: b.dataset.id }), 180);
        break;
      case 'open-chat': vscode.postMessage({ type: 'openChat' }); break;
    }
  });

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data.type === 'data') {
      items = data.items || [];
      loaded = true;
      offlineEl.hidden = !!(data.connection && data.connection.connected);
      render(data.highlightId);
    }
  });

  render();
  vscode.postMessage({ type: 'ready' });
})();
