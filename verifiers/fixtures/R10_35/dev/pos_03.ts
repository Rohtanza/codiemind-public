import { readFile } from 'node:fs/promises';
import path from 'path';
import type { Invoice } from '@/models/invoice';
import { InvoiceRepository } from '@/modules/billing/invoice.repository';

export async function loadInvoices(dir: string): Promise<Invoice[]> {
  const raw = await readFile(path.join(dir, 'invoices.json'), 'utf8');
  const repo = new InvoiceRepository();
  return repo.hydrate(JSON.parse(raw));
}
