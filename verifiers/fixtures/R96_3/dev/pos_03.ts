import * as vscode from 'vscode';

type Mode = 'auto' | 'manual' | 'off';
const MODES: readonly Mode[] = ['auto', 'manual', 'off'];

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('syncer.mode')) return;
      const value = vscode.workspace.getConfiguration('syncer').get<string>('mode', 'auto');
      const mode: Mode = (MODES as readonly string[]).includes(value) ? (value as Mode) : 'auto';
      console.log(`syncer mode is now ${mode}`);
    })
  );
}
