import { createStore, get, set } from 'idb-keyval';

const PouchDB = class {
  private store;
  constructor(name: string) {
    this.store = createStore(name, 'docs');
  }
  put(doc: { _id: string }) {
    return set(doc._id, doc, this.store);
  }
  get(id: string) {
    return get(id, this.store);
  }
};

const db = new PouchDB('notes');

export const saveNote = (id: string, text: string) => db.put({ _id: id, text } as any);
