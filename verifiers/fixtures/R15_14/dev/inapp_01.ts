export interface ApiResponse<T> {
  data: T;
  error_code?: number;
}

export type OrderStatus = "pending" | "shipped" | "delivered";

export enum Role {
  Admin = "admin",
  Viewer = "viewer",
}
