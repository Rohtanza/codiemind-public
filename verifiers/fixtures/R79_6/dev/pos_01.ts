export interface IUserService {
  getUser(id: string): Promise<User | undefined>;
  saveUser(user: User): Promise<void>;
}

export type User = { id: string; name: string };

export class InMemoryUserService implements IUserService {
  private users = new Map<string, User>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async saveUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}
