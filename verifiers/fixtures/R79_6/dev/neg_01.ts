export interface UserService {
  getUser(id: string): Promise<{ id: string; name: string } | undefined>;
}

export class HttpUserService implements UserService {
  constructor(private baseUrl: string) {}

  async getUser(id: string) {
    const res = await fetch(`${this.baseUrl}/users/${id}`);
    return res.ok ? res.json() : undefined;
  }
}
