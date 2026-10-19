import PouchDB from 'pouchdb';

const orders = new PouchDB('orders');

export async function saveOrder(order: { _id: string; total: number }) {
  await orders.put(order);
}

export function queueDraft(draft: object): void {
  const queue = JSON.parse(localStorage.getItem('draft-queue') ?? '[]');
  queue.push(draft);
  localStorage.setItem('draft-queue', JSON.stringify(queue));
}
