// CodieMind memory panel (webview side): search, filter, edit and delete stored memories.
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
  let editingId = null;   // the card whose inline editor is open; kept across re-renders
  let draft = null;       // the editor's unsaved values, carried over when the list re-renders
  const CATEGORIES = ['style', 'naming', 'tool', 'architecture', 'constraint', 'other'];
  searchEl.value = saved.query || '';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // The backend stores UTC times without a zone suffix; read them as UTC, not local time.
  function parseTime(iso) {
    const s = String(iso || '');
    return new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(s) ? s : s + 'Z');
  }

  function ago(iso) {
    const t = parseTime(iso).getTime();
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
    const open = listEl.querySelector('.mem-edit');
    if (open && editingId) {
      draft = { content: open.content.value, rationale: open.rationale ? open.rationale.value : null,
        category: open.category ? open.category.value : null, importance: open.importance.value };
    }
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
      + (editingId === i.id ? editor(i) : '<div class="mem-content">' + esc(i.content) + '</div>'
      + (i.rationale && i.rationale !== i.content ? '<div class="mem-rationale"><span>Because</span> ' + esc(i.rationale) + '</div>' : ''))
      + '<div class="mem-meta"><span class="chip cat-' + esc(i.category) + '">' + esc(i.category) + '</span>'
      + '<span class="importance" title="Importance ' + v + ' of 10"><span class="bar"><i style="width:' + v * 10 + '%"></i></span>' + v + '/10</span>'
      + '<span class="ago" title="' + esc(parseTime(i.createdAt).toLocaleString()) + '">' + ago(i.createdAt) + '</span></div>'
      + '<div class="confirm" hidden><span>Delete this memory?</span>'
      + '<button class="btn danger" data-action="confirm-delete" data-id="' + esc(i.id) + '">Delete</button>'
      + '<button class="btn secondary" data-action="cancel-delete">Cancel</button></div>'
      + '</div>'
      + '<div class="mem-actions">'
      + '<button class="icon-btn" data-action="edit" title="Edit" aria-label="Edit"><span class="codicon codicon-edit"></span></button>'
      + '<button class="icon-btn" data-action="copy" data-text="' + esc(i.content) + '" title="Copy" aria-label="Copy"><span class="codicon codicon-copy"></span></button>'
      + '<button class="icon-btn" data-action="delete" title="Delete" aria-label="Delete"><span class="codicon codicon-trash"></span></button>'
      + '</div></article>';
  }

  // Inline editor. The backend has no update endpoint, so saving stores the edited memory and then
  // deletes the old one: the memory gets a new id and a fresh timestamp, so it counts as new for recency.
  function editor(i) {
    const isDec = i.kind === 'decision';
    const d = draft || {};
    const v = d.importance != null ? d.importance : Math.max(1, Math.min(10, Number(i.importance) || 5));
    const cat = d.category || i.category;
    return '<form class="mem-edit" novalidate data-id="' + esc(i.id) + '">'
      + '<textarea name="content" rows="3" maxlength="2000" aria-label="' + (isDec ? 'Decision' : 'Preference') + ' text">' + esc(d.content != null ? d.content : i.content) + '</textarea>'
      + (isDec ? '<label class="field">Because<textarea name="rationale" rows="2" maxlength="2000">' + esc(d.rationale != null ? d.rationale : (i.rationale || '')) + '</textarea></label>' : '')
      + '<div class="edit-row">'
      + (isDec ? '' : '<label class="field inline">Category<select name="category">'
        + CATEGORIES.map(c => '<option' + (c === cat ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label>')
      + '<label class="field inline">Importance<input name="importance" type="number" min="1" max="10" value="' + esc(v) + '"></label>'
      + '</div>'
      + '<p class="edit-note">Saving replaces this memory: it gets a new id and counts as new for recency.</p>'
      + '<p class="edit-error" hidden></p>'
      + '<div class="edit-actions">'
      + '<button type="submit" class="btn">Save</button>'
      + '<button type="button" class="btn secondary" data-action="cancel-edit">Cancel</button>'
      + '<span class="hint">Ctrl+Enter to save, Esc to cancel</span></div></form>';
  }

  function openEditor(id) {
    editingId = id;
    draft = null;
    listEl.querySelectorAll('.mem-edit').forEach(f => f.remove());
    render();
    const ta = listEl.querySelector('.mem-edit textarea[name="content"]');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  function closeEditor() { editingId = null; draft = null; listEl.querySelectorAll('.mem-edit').forEach(f => f.remove()); render(); }

  function submitEdit(form) {
    const item = items.find(x => x.id === form.dataset.id);
    if (!item) { closeEditor(); return; }
    const errEl = form.querySelector('.edit-error');
    const content = form.content.value.trim();
    const rationale = form.rationale ? form.rationale.value.trim() : null;
    const importance = Number(form.importance.value);
    const category = form.category ? form.category.value : item.category;
    let err = '';
    if (!content) err = 'The text cannot be empty.';
    else if (form.rationale && !rationale) err = 'A decision needs a reason.';
    else if (!Number.isInteger(importance) || importance < 1 || importance > 10) err = 'Importance must be a whole number from 1 to 10.';
    if (err) { errEl.textContent = err; errEl.hidden = false; return; }
    const unchanged = content === item.content && importance === Number(item.importance)
      && category === item.category && (rationale === null || rationale === (item.rationale || ''));
    if (unchanged) { closeEditor(); return; }
    form.classList.add('saving');
    form.querySelectorAll('button, textarea, input, select').forEach(el => { el.disabled = true; });
    vscode.postMessage({ type: 'edit', id: item.id, content, rationale, importance, category });
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
      case 'edit': openEditor(cardEl.id.slice(2)); break;
      case 'cancel-edit': closeEditor(); break;
      case 'delete': cardEl.querySelector('.confirm').hidden = false; break;
      case 'cancel-delete': cardEl.querySelector('.confirm').hidden = true; break;
      case 'confirm-delete':
        cardEl.classList.add('removing');
        setTimeout(() => vscode.postMessage({ type: 'delete', id: b.dataset.id }), 180);
        break;
      case 'open-chat': vscode.postMessage({ type: 'openChat' }); break;
    }
  });

  listEl.addEventListener('submit', (e) => {
    const form = e.target.closest('.mem-edit');
    if (!form) return;
    e.preventDefault();
    submitEdit(form);
  });
  listEl.addEventListener('input', (e) => {
    const form = e.target.closest('.mem-edit');
    if (form) form.querySelector('.edit-error').hidden = true;
  });
  listEl.addEventListener('keydown', (e) => {
    const form = e.target.closest('.mem-edit');
    if (!form) return;
    if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitEdit(form); }
  });

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data.type === 'editResult') {
      if (data.ok) { editingId = null; draft = null; return; }   // the fresh list follows in a 'data' message
      const form = listEl.querySelector('.mem-edit');
      if (form) {
        form.classList.remove('saving');
        form.querySelectorAll('button, textarea, input, select').forEach(el => { el.disabled = false; });
        const errEl = form.querySelector('.edit-error');
        errEl.textContent = data.error || 'Could not save the change.';
        errEl.hidden = false;
      }
      return;
    }
    if (data.type === 'data') {
      items = data.items || [];
      loaded = true;
      if (editingId && !items.some(x => x.id === editingId)) { editingId = null; draft = null; }
      offlineEl.hidden = !!(data.connection && data.connection.connected);
      // A background refresh must not rebuild the card being edited (it would drop focus and the caret).
      if (editingId && listEl.querySelector('.mem-edit:not(.saving)') && !data.highlightId) return;
      offlineEl.hidden = !!(data.connection && data.connection.connected);
      render(data.highlightId);
    }
  });

  render();
  vscode.postMessage({ type: 'ready' });
})();
