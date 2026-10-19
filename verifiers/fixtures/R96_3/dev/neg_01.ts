import * as vscode from 'vscode';

export function getRequestTimeout(): number {
  const cfg = vscode.workspace.getConfiguration('restRunner');
  const timeout = cfg.get<number>('timeout');
  return timeout ?? 5000;
}
