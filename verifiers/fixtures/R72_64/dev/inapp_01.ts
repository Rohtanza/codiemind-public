export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(item: T): Promise<void>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
  clear(): Promise<void>;
  saveMany(items: T[]): Promise<void>;
  findMany(ids: string[]): Promise<T[]>;
  removeMany(ids: string[]): Promise<void>;
  first(): Promise<T | null>;
}

export function createMemoryRepo<T extends { id: string }>(): Map<string, T> {
  return new Map<string, T>();
}
