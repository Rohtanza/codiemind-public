import Dexie, { Table } from 'dexie';

export interface Task {
  id?: number;
  title: string;
}

class AppDB extends Dexie {
  tasks!: Table<Task, number>;
  constructor() {
    super('app');
    this.version(1).stores({ tasks: '++id, title' });
  }
}

export const db = new AppDB();

export const addTask = (title: string) => db.tasks.add({ title });
