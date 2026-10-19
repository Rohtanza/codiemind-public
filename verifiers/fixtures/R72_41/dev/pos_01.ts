interface User {
  id: number;
  email: string;
}

export function getUser(users: User[], id: number): User | undefined {
  return users.find((u) => u.id === id);
}

export function validateEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
