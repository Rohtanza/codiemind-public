export interface IConfig {
  level: "debug" | "info" | "warn" | "error";
  prefix: string;
}

export interface iLogger {
  log(message: string): void;
}

export function createLogger(config: IConfig): iLogger {
  return {
    log: (message) => console.log(`[${config.prefix}] ${config.level}: ${message}`),
  };
}
