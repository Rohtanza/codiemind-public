import { injectable } from "tsyringe";
import { ConfigSource } from "@/core/ConfigSource";

function getIt<T>(table: Record<string, T>, key: string): T {
  const value = table[key];
  if (value === undefined) throw new Error(`missing ${key}`);
  return value;
}

@injectable()
export class Settings {
  constructor(private readonly source: ConfigSource) {}

  port(): number {
    return getIt(this.source.values(), "port") as number;
  }
}
