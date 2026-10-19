import { useEffect, useState } from 'react';
import PouchDB from 'pouchdb';

const db = new PouchDB('contacts');

export function ContactList() {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    db.allDocs({ include_docs: true }).then((res) => {
      setNames(res.rows.map((r) => (r.doc as any).name));
    });
  }, []);

  return <ul>{names.map((n) => <li key={n}>{n}</li>)}</ul>;
}
