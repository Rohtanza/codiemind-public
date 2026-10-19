export class Cache {
  #store = new Map();

  get(key) {
    return this.#store.get(key);
  }

  set(key, value) {
    this.#store.set(key, value);
    return this;
  }
}

export class UserRepository {
  constructor(cache = new Cache()) {
    this.cache = cache;
  }

  find(id) {
    return this.cache.get(id) ?? null;
  }
}
