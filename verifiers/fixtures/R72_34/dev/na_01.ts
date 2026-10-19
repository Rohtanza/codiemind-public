export interface User {
  id: string;
  name: string;

  email: string;
}

export const DEFAULT_PAGE_SIZE = 20;

export const ROLES = {
  admin: "admin",

  viewer: "viewer",
} as const;
