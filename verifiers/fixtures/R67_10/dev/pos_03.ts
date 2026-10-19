export { apiClient } from '@/services/apiClient';
export * from '@/services/types';
import type { Config } from '@/config';

export const defaultTimeout: Config['timeout'] = 5000;
