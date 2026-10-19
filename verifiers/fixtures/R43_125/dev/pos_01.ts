export interface User {
  id: string;
  name: string;
  email?: string;
}

export function greet(user: User): string {
  return `Hello, ${user.name}`;
}
