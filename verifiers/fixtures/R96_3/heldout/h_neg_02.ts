import type { WorkspaceConfiguration } from 'vscode';

export interface ServerOptions {
  port: number;
  verbose: boolean;
}

export function readServerOptions(section: WorkspaceConfiguration): ServerOptions {
  const port = section.get<number>('port', 8080);
  const verbose = section.get<boolean>('verbose')!;
  return { port: port > 0 && port < 65536 ? port : 8080, verbose };
}
