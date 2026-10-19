interface User {
  id: number;
  name: string;
  email: string;
}

export function formatUser(user: User, includeEmail: boolean): string {
  const base: string = `${user.id}: ${user.name}`;
  return includeEmail ? `${base} <${user.email}>` : base;
}
