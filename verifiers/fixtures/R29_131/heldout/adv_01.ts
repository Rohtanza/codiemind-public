interface GameConsole {
  log(line: string): void;
  clear(): void;
}

const commands: Record<string, (args: string[]) => string> = {
  echo: (args) => args.join(" "),
  help: () => "Available commands: echo, help",
};

export function runCommand(input: string, console: GameConsole): void {
  const [name, ...args] = input.trim().split(/\s+/);
  const handler = commands[name];
  if (!handler) {
    globalThis.console.error(`Unknown command typed: ${name}`);
    console.log(`Unknown command: ${name}`);
    return;
  }
  console.log(handler(args));
}
