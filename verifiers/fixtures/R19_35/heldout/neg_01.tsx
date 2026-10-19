import { atom, useAtom, useAtomValue } from 'jotai';

const filterAtom = atom<'all' | 'done'>('all');

export function FilterToggle() {
  const [filter, setFilter] = useAtom(filterAtom);
  return (
    <button onClick={() => setFilter(filter === 'all' ? 'done' : 'all')}>
      Showing: {filter}
    </button>
  );
}

export function FilterLabel() {
  const filter = useAtomValue(filterAtom);
  return <small>{filter}</small>;
}
