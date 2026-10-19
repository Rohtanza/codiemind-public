export interface ApiResult<T = any> {
  ok: boolean;
  data: T;
}

export function success<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}
