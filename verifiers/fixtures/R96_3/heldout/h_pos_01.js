const vscode = require('vscode');

function isAutoSaveEnabled() {
  const value = vscode.workspace.getConfiguration('autoCommit').get('enabled', false);
  if (typeof value !== 'boolean') {
    vscode.window.showWarningMessage('autoCommit.enabled must be a boolean; using false.');
    return false;
  }
  return value;
}

module.exports = { isAutoSaveEnabled };
