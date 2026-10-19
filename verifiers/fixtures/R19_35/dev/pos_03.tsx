import { createContext, useContext, useReducer, ReactNode } from 'react';

type CartState = { items: string[] };
type CartAction = { type: 'add'; item: string };

const CartContext = createContext<{ state: CartState; dispatch: (a: CartAction) => void } | null>(null);

function reducer(state: CartState, action: CartAction): CartState {
  return { items: [...state.items, action.item] };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export function CartCount() {
  const { state } = useCart();
  return <span>{state.items.length}</span>;
}
