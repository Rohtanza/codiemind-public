import * as vscode from 'vscode';
import { ListMemoriesResponse } from '../api/client';
import { MemoryItem } from '../types';

export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

export function toMemoryItems(list: ListMemoriesResponse): MemoryItem[] {
  return [
    ...list.preferences.map(p => ({
      id: p.id,
      kind: 'preference' as const,
      content: p.content,
      rationale: null,
      category: p.category,
      scopeType: p.scope_type,
      importance: p.importance,
      source: p.source,
      createdAt: p.created_at,
    })),
    ...list.decisions.map(d => ({
      id: d.id,
      kind: 'decision' as const,
      content: d.content,
      rationale: d.rationale,
      category: 'architecture',
      scopeType: d.scope_type,
      importance: d.importance,
      source: 'explicit',
      createdAt: d.created_at,
    })),
  ];
}

/**
 * Page skeleton shared by both webviews: strict CSP (scripts only with the nonce, no remote
 * content), codicons, the panel stylesheet and the panel script.
 */
export function webviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  opts: { styles: string[]; scripts: string[]; body: string }
): string {
  const nonce = getNonce();
  const uri = (p: string) => webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', p)).toString();
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data:`,
    `font-src ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
  ].join('; ');
  const links = ['vendor/codicon.css', 'base.css', ...opts.styles]
    .map(s => `<link rel="stylesheet" href="${uri(s)}">`).join('\n  ');
  const scripts = opts.scripts
    .map(s => `<script nonce="${nonce}" src="${uri(s)}"></script>`).join('\n  ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${links}
</head>
<body>
  ${opts.body.replace(/\{\{media\}\}/g, uri(''))}
  ${scripts}
</body>
</html>`;
}
