interface User {
  id: number;
  name: string;
  email: string;
}

export function formatUser(user: User): string {
  return `${user.name} <${user.email}>`;
}

export function findUser(users: User[], id: number): User | undefined {
  return users.find((u: User) => u.id === id);
}
