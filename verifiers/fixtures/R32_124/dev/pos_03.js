const store = {
  state: {},
  InitializeStore(defaults) {
    this.state = { ...defaults };
  },
  get(key) {
    return this.state[key];
  },
};

store.InitializeStore({ theme: "dark" });
module.exports = store;
