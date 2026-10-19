export type UserService = {
  getUser(id: string): Promise<string | undefined>;
};

export class UserCache {
  private cache = new Map<string, string>();

  get(id: string): string | undefined {
    return this.cache.get(id);
  }

  set(id: string, name: string): void {
    this.cache.set(id, name);
  }
}
