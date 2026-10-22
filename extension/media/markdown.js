// Minimal Markdown renderer for chat replies. Every piece of text is HTML-escaped before any
// markup is added, so model output can never inject HTML into the webview.
(function () {
  'use strict';

  const blocks = new Map(); // code block id -> { code, lang }
  let counter = 0;
  let memories = []; // memories of the reply being rendered, for citation badges
  const TAG = /\[(pref|dec):([a-f0-9-]{36})\]/g;

  const LANG_LABELS = {
    ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', js: 'JavaScript', javascript: 'JavaScript',
    jsx: 'JSX', py: 'Python', python: 'Python', sh: 'Shell', bash: 'Bash', shell: 'Shell', json: 'JSON',
    html: 'HTML', css: 'CSS', sql: 'SQL', java: 'Java', go: 'Go', rust: 'Rust', yaml: 'YAML', yml: 'YAML',
    md: 'Markdown', markdown: 'Markdown', cpp: 'C++', c: 'C', csharp: 'C#', cs: 'C#', php: 'PHP', diff: 'Diff',
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(text) {
    const codes = [];
    let s = escapeHtml(text).replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    s = s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" title="$2">$1</a>');
    s = s.replace(TAG, (_, kind, id) => citeBadge(kind, id));
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codes[Number(i)] + '</code>');
  }

  function citeBadge(kind, id) {
    const m = memories.find(x => x.id === id);
    const label = m ? (m.content.length > 32 ? m.content.slice(0, 30) + '…' : m.content) : (kind === 'dec' ? 'decision' : 'preference');
    return '<span class="cite" title="' + escapeHtml(m ? 'Applies: ' + m.content : 'Cites a stored ' + label) + '">'
      + '<span class="codicon codicon-' + (kind === 'dec' ? 'law' : 'check') + '"></span>' + escapeHtml(label) + '</span>';
  }

  /** Citation tags are for the UI, not the user's code: drop them (and comments they leave empty). */
  function stripTags(code) {
    const out = [];
    for (const line of code.split('\n')) {
      TAG.lastIndex = 0;
      if (!TAG.test(line)) { out.push(line); continue; }
      const cleaned = line.replace(/\s*\[(pref|dec):[a-f0-9-]{36}\]/g, '').replace(/\s*(\/\/|#|\/\*\s*\*\/)\s*$/, '');
      if (cleaned.trim() !== '') out.push(cleaned);
    }
    TAG.lastIndex = 0;
    return out.join('\n');
  }

  function highlight(code, lang) {
    const hljs = window.hljs;
    const l = (lang || '').toLowerCase();
    if (hljs && l && hljs.getLanguage(l)) {
      try { return hljs.highlight(code, { language: l, ignoreIllegals: true }).value; } catch (e) { /* fall through */ }
    }
    return escapeHtml(code);
  }

  function codeBlock(raw, lang) {
    const code = stripTags(raw);
    const id = 'cb' + (++counter);
    blocks.set(id, { code, lang });
    const label = LANG_LABELS[(lang || '').toLowerCase()] || (lang || 'Code');
    return '<div class="code-block" data-block="' + id + '">'
      + '<div class="code-head"><span class="lang">' + escapeHtml(label) + '</span>'
      + '<div class="code-actions">'
      + '<button class="icon-btn" data-action="copy" title="Copy" aria-label="Copy code"><span class="codicon codicon-copy"></span></button>'
      + '<button class="icon-btn" data-action="insert" title="Insert at cursor" aria-label="Insert at cursor"><span class="codicon codicon-insert"></span></button>'
      + '<button class="icon-btn" data-action="newfile" title="Open in new file" aria-label="Open in new file"><span class="codicon codicon-new-file"></span></button>'
      + '</div></div>'
      + '<pre><code class="hljs">' + highlight(code, lang) + '</code></pre></div>';
  }

  function splitRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  }

  function render(src, mems) {
    if (mems) memories = mems;
    const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let para = [];
    const flush = () => {
      if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fence = line.match(/^\s*```\s*([\w+#.-]*)\s*$/);
      if (fence) {
        flush();
        const body = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
        out.push(codeBlock(body.join('\n'), fence[1]));
        continue;
      }
      if (/^\s*$/.test(line)) { flush(); continue; }

      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flush(); const lvl = Math.min(h[1].length + 2, 6); out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>'); continue; }

      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); out.push('<hr>'); continue; }

      if (/^\s*>/.test(line)) {
        flush();
        const q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        i--;
        out.push('<blockquote>' + render(q.join('\n'), null) + '</blockquote>');
        continue;
      }

      if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        flush();
        const head = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') { rows.push(splitRow(lines[i])); i++; }
        i--;
        out.push('<div class="table-wrap"><table><thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('')
          + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('')
          + '</tbody></table></div>');
        continue;
      }

      const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (li) {
        flush();
        const ordered = /\d/.test(li[2]);
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (m) { items.push({ indent: m[1].length, text: m[3] }); i++; continue; }
          if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; continue; }
          break;
        }
        i--;
        out.push(renderList(items, ordered));
        continue;
      }

      para.push(line.trim());
    }
    flush();
    return out.join('');
  }

  function renderList(items, ordered) {
    const tag = ordered ? 'ol' : 'ul';
    const base = items.length ? items[0].indent : 0;
    let html = '<' + tag + '>';
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      if (it.indent > base + 1) continue; // rendered as part of the previous item's sub-list
      html += '<li>' + inline(it.text);
      const sub = [];
      for (let j = k + 1; j < items.length && items[j].indent > base + 1; j++) sub.push(items[j]);
      if (sub.length) html += renderList(sub, false);
      html += '</li>';
    }
    return html + '</' + tag + '>';
  }

  window.CMMarkdown = { render, escapeHtml, blocks };
})();
