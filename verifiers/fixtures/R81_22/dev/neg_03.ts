import { writable, derived } from 'svelte/store';

export const items = writable<string[]>([]);
export const itemCount = derived(items, ($items) => $items.length);

export function addItem(item: string) {
  items.update((list) => [...list, item]);
}
