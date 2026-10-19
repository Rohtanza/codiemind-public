import { createSignal, For } from 'solid-js';

export function TagList(props: { initial: string[] }) {
  const [tags, setTags] = createSignal(props.initial);
  const remove = (t: string) => setTags(tags().filter((x) => x !== t));
  return (
    <ul>
      <For each={tags()}>{(t) => <li onClick={() => remove(t)}>{t}</li>}</For>
    </ul>
  );
}
