import { readFile } from "fs/promises";

export const loadConfig = async (path: string): Promise<Record<string, unknown>> => {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Invalid config at ${path}`);
  }
  return parsed as Record<string, unknown>;
};
