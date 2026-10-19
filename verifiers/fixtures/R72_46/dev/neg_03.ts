interface User {
  permissions: string[];
}

export const checkPermission = (user: User, perm: string) =>
  user.permissions.includes(perm);

export const hasAnyPermission = (user: User) => user.permissions.length > 0;
