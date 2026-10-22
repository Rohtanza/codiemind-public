export interface ParsedCommand {
  type: 'remember' | 'decide' | 'forget' | 'memories' | 'context' | 'help' | 'chat';
  text: string;
  rationale?: string;
}

/** Commands shown in the chat's @ menu, in display order. */
export const COMMANDS = [
  { name: '@remember', args: '<preference>', description: 'Store a coding preference' },
  { name: '@decide', args: '<decision> because <reason>', description: 'Record a project decision' },
  { name: '@forget', args: '<keyword>', description: 'Remove a stored memory' },
  { name: '@memories', args: '', description: 'List stored memories' },
  { name: '@context', args: '', description: 'Show how the last prompt was assembled' },
  { name: '@help', args: '', description: 'Show what CodieMind can do' },
];

function startsWithCommand(text: string, cmd: string): boolean {
  return text === cmd || text.startsWith(cmd + ' ') || text.startsWith(cmd + '\n');
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  if (startsWithCommand(trimmed, '@remember')) {
    return { type: 'remember', text: trimmed.slice('@remember'.length).trim() };
  }

  if (startsWithCommand(trimmed, '@decide')) {
    const rest = trimmed.slice('@decide'.length).trim();
    const becauseIndex = rest.toLowerCase().indexOf(' because ');
    if (becauseIndex !== -1) {
      return {
        type: 'decide',
        text: rest.slice(0, becauseIndex).trim(),
        rationale: rest.slice(becauseIndex + ' because '.length).trim()
      };
    }
    return { type: 'decide', text: rest };
  }

  if (startsWithCommand(trimmed, '@forget')) {
    return { type: 'forget', text: trimmed.slice('@forget'.length).trim() };
  }

  if (startsWithCommand(trimmed, '@memories')) {
    return { type: 'memories', text: trimmed };
  }

  if (startsWithCommand(trimmed, '@context')) {
    return { type: 'context', text: trimmed };
  }

  if (startsWithCommand(trimmed, '@help')) {
    return { type: 'help', text: trimmed };
  }

  return { type: 'chat', text: trimmed };
}

/**
 * Label an explicitly stated preference with a category for display and filtering.
 * Keyword heuristic only. The category does not enter the retrieval score.
 */
export function guessCategory(text: string): 'style' | 'naming' | 'tool' | 'architecture' | 'constraint' {
  const t = text.toLowerCase();
  if (/\b(name|names|naming|camelcase|snake_case|pascalcase|kebab|prefix|suffix)\b/.test(t)) { return 'naming'; }
  if (/\b(architecture|layer|layers|module|modules|folder|folders|directory|service|services|pattern|structure)\b/.test(t)) { return 'architecture'; }
  if (/\b(library|libraries|package|framework|axios|fetch|lodash|jest|vitest|pytest|npm|yarn|pnpm|eslint|prettier|tool)\b/.test(t)) { return 'tool'; }
  if (/\b(never|must|do not|don't|avoid|forbid|forbidden|no)\b/.test(t)) { return 'constraint'; }
  return 'style';
}
