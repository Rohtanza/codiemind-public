export interface ApiResponse {
  status: number;
  items: any[];
  meta: Record<string, string>;
}

export function countItems(res: ApiResponse): number {
  return res.items.length;
}
