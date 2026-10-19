import { logger } from '@/lib/logger';
import { formatCurrency } from '@/utils/currency';
// import { legacyFormat } from '../legacy/format';

export function renderTotal(amount: number, currency: string): string {
  const text = formatCurrency(amount, currency);
  logger.debug('rendered total', { text });
  return text;
}
