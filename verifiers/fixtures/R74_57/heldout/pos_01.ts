import PouchDB from 'pouchdb-core';
import IdbAdapter from 'pouchdb-adapter-idb';
import HttpAdapter from 'pouchdb-adapter-http';
import Replication from 'pouchdb-replication';

PouchDB.plugin(IdbAdapter).plugin(HttpAdapter).plugin(Replication);

export const inventory = new PouchDB('inventory', { adapter: 'idb' });

export function replicateFrom(url: string) {
  return PouchDB.replicate(url, inventory, { live: true });
}
