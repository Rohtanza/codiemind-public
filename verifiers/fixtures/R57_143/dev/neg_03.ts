import { join } from "jsr:@std/path";

export async function renderMarkdown(file: string): Promise<string> {
  const { marked } = await import("marked");
  const text = await Deno.readTextFile(join("docs", file));
  return marked.parse(text) as string;
}
