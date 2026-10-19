export interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

export interface Page<T> extends ApiResponse<T[]> {
  page: number;
  total: number;
}
