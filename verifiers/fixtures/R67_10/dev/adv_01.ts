// Previously: import { logger } from '../lib/logger';
// Switched to the path alias so moves don't break this file.
import { logger } from '@/lib/logger';

export function logStartup(port: number): void {
  logger.info(`Server listening on ${port}`);
}
