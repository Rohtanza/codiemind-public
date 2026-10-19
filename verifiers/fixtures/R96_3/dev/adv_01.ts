import * as vscode from 'vscode';

const cache = new Map<string, number>();

export function indentWidth(languageId: string): number {
  const cached = cache.get(languageId);
  if (cached !== undefined) return cached;
  const cfg = vscode.workspace.getConfiguration('indentHelper', { languageId });
  const width = cfg.get<number>('width', 2);
  const safe = Number.isInteger(width) && width > 0 ? width : 2;
  cache.set(languageId, safe);
  return safe;
}
