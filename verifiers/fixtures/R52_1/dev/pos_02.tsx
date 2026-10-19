import React from "react";

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const TodoItem = ({ todo }: { todo: Todo }) => (
  <li className={todo.done ? "done" : ""}>{todo.title}</li>
);

export const TodoList = ({ todos }: { todos: Todo[] }) => {
  if (todos.length === 0) {
    return <p>Nothing to do.</p>;
  }
  return (
    <ul>
      {todos.map((t) => (
        <TodoItem key={t.id} todo={t} />
      ))}
    </ul>
  );
};
