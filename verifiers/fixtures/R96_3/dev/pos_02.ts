import { workspace } from 'vscode';

export class LintSettings {
  readonly enabled: boolean;
  readonly maxProblems: number;

  constructor() {
    const config = workspace.getConfiguration('quickLint');
    const enabled = config.get<boolean>('enabled', true);
    this.enabled = typeof enabled === 'boolean' ? enabled : true;
    const max = config.get<number>('maxProblems', 100);
    this.maxProblems = Number.isFinite(max) && max > 0 ? max : 100;
  }
}
