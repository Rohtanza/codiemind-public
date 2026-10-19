import { readFileSync, writeFileSync } from "fs";

export function copyFile(src: string, dest: string): boolean {
  let data: string;
  try {
    data = readFileSync(src, "utf8");
  } catch (readErr: unknown) {
    console.warn("read failed", readErr);
    return false;
  }
  try {
    writeFileSync(dest, data);
    return true;
  } catch (writeErr: unknown) {
    console.warn("write failed", writeErr);
    return false;
  } finally {
    console.log("copy attempted");
  }
}
