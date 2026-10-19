const vscode = require('vscode');

function getExcludedFolders() {
  const folders = vscode.workspace.getConfiguration('todoTree').get('excludeFolders');
  return Array.isArray(folders) ? folders : [];
}

module.exports = { getExcludedFolders };
