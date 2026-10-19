export type Status = "idle" | "loading" | "error";

export interface FetchState<T> {
  status: Status;
  data: T | null;
  error?: Error;
}

export type Handler = (state: FetchState<unknown>) => void;
