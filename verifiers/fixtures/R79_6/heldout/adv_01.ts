export interface IApiClient {
  get(path: string): Promise<unknown>;
}

namespace Api { export interface Response { code: number; body: string } }

export function toResponse(code: number, body: string): Api.Response {
  return { code, body };
}
