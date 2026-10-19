export interface IEntity {
  id: number;
}

export interface IRepository<T extends IEntity> {
  findById(id: number): T | undefined;
  findAll(): T[];
  add(item: T): void;
}

export interface IProduct extends IEntity {
  title: string;
  price: number;
}
