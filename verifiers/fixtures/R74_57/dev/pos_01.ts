import PouchDB from 'pouchdb';

interface Todo {
  _id: string;
  title: string;
  done: boolean;
}

const db = new PouchDB<Todo>('todos');

export async function addTodo(title: string): Promise<void> {
  await db.put({ _id: new Date().toISOString(), title, done: false });
}

export async function listTodos(): Promise<Todo[]> {
  const result = await db.allDocs({ include_docs: true });
  return result.rows.map((row) => row.doc as Todo);
}
