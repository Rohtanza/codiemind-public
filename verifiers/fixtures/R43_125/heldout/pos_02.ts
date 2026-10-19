export interface Repository<T, K = string> {
  findById(id: K): Promise<T | undefined>;
  save(entity: T): Promise<void>;
}

export type Entity = Record<string, unknown>;
export type Keys = keyof Repository<Entity>;
