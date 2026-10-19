type Config = { enabled: boolean; retries?: number };

/**
 * Refactored from the old version, which read:
 *   if (config) { if (config.enabled) { return config.retries ?? 3; } }
 */
export function resolveRetries(config: Config | null): number {
  if (!config) return 0;
  if (!config.enabled) return 0;
  return config.retries ?? 3;
}
