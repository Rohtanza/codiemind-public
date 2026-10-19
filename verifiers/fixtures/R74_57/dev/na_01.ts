export interface User {
  id: number;
  name: string;
}

const BASE_URL = 'https://api.example.com';

export async function getUser(id: number): Promise<User> {
  const res = await fetch(`${BASE_URL}/users/${id}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as User;
}
