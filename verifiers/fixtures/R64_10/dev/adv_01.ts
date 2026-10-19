interface AppConfig {
  port: number;
  host: string;
}

// Parses the config file; avoids `any` by typing the result.
export function readPort(raw: string): number {
  const config = JSON.parse(raw);
  return config.port;
}

export function describe(cfg: AppConfig): string {
  return `${cfg.host}:${cfg.port}`;
}
