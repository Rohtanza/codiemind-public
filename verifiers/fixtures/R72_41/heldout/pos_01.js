const store = new Map();

export const settings = {
  loadConfig(key) {
    return store.get(key) ?? null;
  },
  saveConfig(key, value) {
    store.set(key, value);
  },
  async *streamKeys() {
    for (const k of store.keys()) yield k;
  },
};
