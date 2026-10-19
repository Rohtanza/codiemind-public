export interface ProductDto {
  id: string;
  title: string;
  priceCents: number;
}

export function toProductDto(record: { sku: string; name: string; price: number }): ProductDto {
  return {
    id: record.sku,
    title: record.name,
    priceCents: Math.round(record.price * 100),
  };
}
