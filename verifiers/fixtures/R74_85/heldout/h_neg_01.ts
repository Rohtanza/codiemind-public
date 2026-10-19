export interface Todo {
  id: string;
  title: string;
  done: boolean;
}

const KEY = "todos";

export function loadTodos(): Todo[] {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Todo[]) : [];
}

export function saveTodos(todos: Todo[]): void {
  localStorage.setItem(KEY, JSON.stringify(todos));
}
