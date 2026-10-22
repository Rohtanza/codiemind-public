import * as vscode from 'vscode';
import { ChatPanelProvider } from './panels/ChatPanelProvider';
import { MemoryPanelProvider } from './panels/MemoryPanelProvider';
import { MemoryService } from './services/memoryService';

export function activate(context: vscode.ExtensionContext): void {
  const memory = new MemoryService();
  const chatProvider = new ChatPanelProvider(context.extensionUri, context.workspaceState, memory);
  const memoryProvider = new MemoryPanelProvider(context.extensionUri, memory);

  context.subscriptions.push(
    memory,
    vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewType, chatProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.window.registerWebviewViewProvider(MemoryPanelProvider.viewType, memoryProvider),

    vscode.commands.registerCommand('codiemind.newChat', () => chatProvider.newChat()),
    vscode.commands.registerCommand('codiemind.openMemories', (id?: string) => memoryProvider.reveal(id)),
    vscode.commands.registerCommand('codiemind.refreshMemories', () => memory.refresh()),
    vscode.commands.registerCommand('codiemind.askAboutSelection', () => askAboutSelection(chatProvider)),
  );

  // Status bar: memory count and backend state, click to open the Memories view.
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.command = 'codiemind.openMemories';
  const render = () => {
    const c = memory.connection;
    if (c.connected) {
      const n = memory.items.length;
      status.text = `$(database) CodieMind · ${n} ${n === 1 ? 'memory' : 'memories'}`;
      status.tooltip = `CodieMind connected to ${c.url}${c.chatModel ? ` (${c.chatModel})` : ''}. Click to show memories.`;
      status.backgroundColor = undefined;
    } else {
      status.text = '$(debug-disconnect) CodieMind offline';
      status.tooltip = `CodieMind cannot reach the backend at ${c.url}.`;
      status.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
  };
  render();
  status.show();
  context.subscriptions.push(
    status,
    memory.onDidChangeMemories(render),
    memory.onDidChangeConnection(render),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('codiemind.backendUrl')) { void memory.refresh(); }
    }),
  );

  memory.start();
}

async function askAboutSelection(chat: ChatPanelProvider): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showInformationMessage('Select some code first, then ask CodieMind about it.');
    return;
  }
  const question = await vscode.window.showInputBox({
    title: 'Ask CodieMind about the selected code',
    prompt: 'Your stored preferences are applied to the answer.',
    value: 'Explain this code',
    valueSelection: [0, 'Explain this code'.length],
  });
  if (!question) { return; }
  const code = editor.document.getText(editor.selection);
  const lang = editor.document.languageId;
  const file = vscode.workspace.asRelativePath(editor.document.uri);
  // Keep the whole message inside the backend's 4,000-character query limit.
  const head = `${question}\n\nFrom ${file}:\n\`\`\`${lang}\n`;
  const tail = '\n```';
  const room = 4000 - head.length - tail.length;
  const body = code.length > room ? code.slice(0, Math.max(0, room - 20)) + '\n// … (truncated)' : code;
  await chat.ask(head + body + tail);
}

export function deactivate(): void {
  // Resources are disposed via context.subscriptions
}
