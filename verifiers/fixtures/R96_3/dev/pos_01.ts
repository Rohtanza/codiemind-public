import * as vscode from 'vscode';

export function getTabSize(): number {
  const cfg = vscode.workspace.getConfiguration('formatterPlus');
  const raw = cfg.get<number>('tabSize', 4);
  if (!Number.isInteger(raw) || raw < 1 || raw > 16) {
    return 4;
  }
  return raw;
}
