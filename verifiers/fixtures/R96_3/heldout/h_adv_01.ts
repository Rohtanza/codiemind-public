import * as vscode from 'vscode';

class ProfileStore {
  private profiles = new Map<string, Map<string, unknown>>();
  getConfiguration(name: string): Map<string, unknown> {
    return this.profiles.get(name) ?? new Map();
  }
}

const store = new ProfileStore();

export function resolveProfile(name: string) {
  const overrides = store.getConfiguration(name).get('overrides');
  const strict = vscode.workspace.getConfiguration('profiles').get<boolean>('strict', false);
  return { overrides, strict: strict === true };
}
