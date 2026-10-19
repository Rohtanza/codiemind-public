import Pouch from 'pouchdb-browser';

// Previously cached readings in localStorage; now kept in a local database.
const readings = new Pouch('sensor-readings');

export async function record(sensorId: string, value: number) {
  await readings.post({ sensorId, value, at: Date.now() });
}

export async function latest() {
  const res = await readings.allDocs({ include_docs: true, descending: true, limit: 10 });
  return res.rows.map((r) => r.doc);
}
