import { workspace, ConfigurationTarget } from 'vscode';

export async function bumpFontSize(delta: number): Promise<void> {
  const editorConfig = workspace.getConfiguration('editor');
  const current = editorConfig.get<number>('fontSize', 14);
  const base = Number.isFinite(current) ? current : 14;
  const next = Math.min(40, Math.max(8, base + delta));
  await editorConfig.update('fontSize', next, ConfigurationTarget.Global);
}
