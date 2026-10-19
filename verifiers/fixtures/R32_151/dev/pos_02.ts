export class InvoiceDto {
  constructor(
    public readonly invoiceId: string,
    public readonly amountCents: number,
    public readonly currency: string,
  ) {}
}

export function formatInvoice(dto: InvoiceDto): string {
  const amount = (dto.amountCents / 100).toFixed(2);
  return `${dto.invoiceId}: ${amount} ${dto.currency}`;
}

export const sample = new InvoiceDto('INV-001', 12500, 'EUR');
