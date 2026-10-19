import { openDB } from 'idb';

const dbPromise = openDB('field-reports', 1, {
  upgrade(db) {
    db.createObjectStore('reports', { keyPath: 'id' });
  },
});

export async function saveReport(report: { id: string; text: string }) {
  const db = await dbPromise;
  await db.put('reports', report);
}
