declare global {
  interface Window {
    appConfig: AppConfig;
  }
}

export interface AppConfig {
  readonly apiUrl: string;
  retries: number;
  [key: string]: unknown;
}

export type Handler = (cfg: AppConfig) => void;
