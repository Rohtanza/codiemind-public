// legacy code used catch (err) without a type annotation
export async function load(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    return await res.text();
  } catch (err: unknown) {
    throw new Error(String(err));
  }
}
