export interface ApiResponse {
  status: number;
  data: Record<string, any>;
}

export function getStatus(response: ApiResponse): number {
  return response.status;
}
