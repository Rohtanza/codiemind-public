import { createContext, useContext as useStore } from 'react';

type Store = { count: number; increment: () => void };

const StoreContext = createContext<Store>({ count: 0, increment: () => {} });

export function CountDisplay() {
  const { count } = useStore(StoreContext);
  return <output>{count}</output>;
}

export function IncrementButton() {
  const { increment } = useStore(StoreContext);
  return <button onClick={increment}>+1</button>;
}
