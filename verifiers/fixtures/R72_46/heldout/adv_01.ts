type Toggle = boolean;

export function isKnownFlag(flags: Set<string>, name: string): boolean {
  return flags.has(name);
}

export function featureOn(flags: Set<string>, name: string): Toggle {
  return flags.has(name) && !flags.has(`${name}:off`);
}
