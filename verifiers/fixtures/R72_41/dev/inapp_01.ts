export interface AppConfig {
  apiUrl: string;
  retries: number;
  verbose: boolean;
}

export type Environment = "development" | "staging" | "production";

export const DEFAULT_CONFIG: AppConfig = {
  apiUrl: "http://localhost:8080",
  retries: 3,
  verbose: false,
};
