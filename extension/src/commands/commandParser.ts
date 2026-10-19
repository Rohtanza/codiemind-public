import { PreferenceScope } from '../types';

export interface ParsedCommand {
  type: 'remember' | 'decide' | 'forget' | 'memories' | 'context' | 'chat';
  text: string;
  scope?: PreferenceScope;
  rationale?: string;
}

const IMPLICIT_SIGNALS = [
  "i always prefer", "i always want", "i never want",
  "in this project, use", "in this project, always",
  "do not use", "never use", "avoid using",
  "make sure to", "always make sure",
  "the convention here is", "we follow", "our standard is",
  "from now on", "going forward"
];

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  if (trimmed.startsWith('@remember')) {
    const rest = trimmed.slice('@remember'.length).trim();
    let scope: PreferenceScope = 'project';
    let text = rest;

    if (rest.startsWith('--file ')) {
      scope = 'file';
      text = rest.slice('--file '.length).trim();
    } else if (rest.startsWith('--folder ')) {
      scope = 'folder';
      text = rest.slice('--folder '.length).trim();
    } else if (rest.startsWith('--global ')) {
      scope = 'global';
      text = rest.slice('--global '.length).trim();
    }

    return { type: 'remember', text, scope };
  }

  if (trimmed.startsWith('@decide')) {
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

  if (trimmed.startsWith('@forget')) {
    const rest = trimmed.slice('@forget'.length).trim();
    return { type: 'forget', text: rest };
  }

  if (trimmed.startsWith('@memories')) {
    return { type: 'memories', text: trimmed };
  }

  if (trimmed.startsWith('@context')) {
    return { type: 'context', text: trimmed };
  }

  return { type: 'chat', text: trimmed };
}

export function detectImplicitPreference(input: string): boolean {
  const lower = input.toLowerCase();
  return IMPLICIT_SIGNALS.some(signal => lower.includes(signal));
}
