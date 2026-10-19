const apiBase = "https://example.com";
let retry_count = 0;

export async function loadOrders(): Promise<unknown[]> {
  retry_count++;
  const res = await fetch(`${apiBase}/orders`);
  return res.json();
}
