export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type ApiResponse<T> = {
  data: T;
  status: number;
};
