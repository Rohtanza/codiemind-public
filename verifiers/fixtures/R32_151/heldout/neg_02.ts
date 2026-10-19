export interface SettingsDto {
  readonly theme: 'light' | 'dark';
  readonly language: string;
}

export function applyPatch(current: SettingsDto, patch: Partial<SettingsDto>): SettingsDto {
  Object.assign(current, patch);
  return current;
}
