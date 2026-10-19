interface IRepository<T> {
  save(entity: T): Promise<void>;
}

type Order = { id: string; total: number };

export interface OrderRepository extends IRepository<Order> {
  findByCustomer(customerId: string): Promise<Order[]>;
}
