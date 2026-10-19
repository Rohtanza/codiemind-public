import { workspace } from 'vscode';

export function loadOptions() {
  const config = workspace.getConfiguration('docGen');
  const style = config.get<string>('style', 'jsdoc');
  const outputDir = config.get<string>('outputDir');
  return {
    style: ['jsdoc', 'tsdoc'].includes(style) ? style : 'jsdoc',
    outputDir,
  };
}
