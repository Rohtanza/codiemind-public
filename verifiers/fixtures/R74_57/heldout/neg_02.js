import localforage from 'localforage';

const cart = localforage.createInstance({ name: 'shop', storeName: 'cart' });

export async function addToCart(item) {
  const items = (await cart.getItem('items')) || [];
  items.push(item);
  await cart.setItem('items', items);
}

export function clearCart() {
  return cart.removeItem('items');
}
