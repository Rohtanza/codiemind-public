import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';

PouchDB.plugin(PouchFind);

const local = new PouchDB('notes');
const remote = new PouchDB('https://couch.example.com/notes');

local.sync(remote, { live: true, retry: true }).on('error', (err) => {
  console.error('sync failed', err);
});

export async function findByTag(tag: string) {
  await local.createIndex({ index: { fields: ['tag'] } });
  return local.find({ selector: { tag } });
}
