export function isEmpty(items: unknown[]): boolean {
  return items.length === 0;
}

export function hasRole(user: { roles: string[] }, role: string): boolean {
  return user.roles.includes(role);
}

export function countItems(items: unknown[]): number {
  return items.length;
}
