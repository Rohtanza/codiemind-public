import * as vscode from 'vscode';
import { ChatPanelProvider } from './panels/ChatPanelProvider';
import { MemoryPanelProvider } from './panels/MemoryPanelProvider';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  const chatProvider = new ChatPanelProvider(context.extensionUri);
  const memoryProvider = new MemoryPanelProvider(context.extensionUri);

  // Register webview providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewType, chatProvider)
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MemoryPanelProvider.viewType, memoryProvider)
  );

  // Status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'codiemind.memoryPanel.focus';
  statusBarItem.text = '$(brain) CodieMind';
  statusBarItem.tooltip = 'Click to open Memory panel';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Refresh memory panel when memory count changes from chat
  chatProvider.onDidUpdateMemoryCount(() => {
    memoryProvider.refresh();
  });

  memoryProvider.onDidUpdateMemoryCount(() => {
    // no-op: status bar no longer tracks count from mock
  });

}

export function deactivate(): void {
  // Resources are disposed via context.subscriptions
}
