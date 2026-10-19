const withTimestamps = (entity) => ({
  ...entity,
  createdAt: Date.now(),
});

export const Store = class {
  constructor() {
    this.items = [];
  }

  add(item) {
    this.items.push(withTimestamps(item));
  }
};
