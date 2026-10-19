import * as vscode from 'vscode';

type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
  const config = vscode.workspace.getConfiguration('previewPane');
  const theme = config.get('theme', 'light') as Theme;
  return theme;
}
