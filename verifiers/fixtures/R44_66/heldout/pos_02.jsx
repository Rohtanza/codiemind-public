import { memo } from "react";

export const ListItem = memo(function ListItem({ text, done }) {
  return <li className={done ? "done" : ""}>{text}</li>;
});

export let renderCount = 0;
