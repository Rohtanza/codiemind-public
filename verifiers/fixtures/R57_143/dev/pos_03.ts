import * as path from "jsr:@std/path";
import dayjs from "npm:dayjs";

export function stampedName(dir: string, base: string): string {
  const stamp = dayjs().format("YYYYMMDD");
  return path.join(dir, `${stamp}-${base}`);
}
