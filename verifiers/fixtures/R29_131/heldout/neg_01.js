async function rebuildIndex(db, documents) {
  console.time("rebuildIndex");
  await db.clearIndex();
  for (const doc of documents) {
    await db.index(doc.id, doc.body);
  }
  console.timeEnd("rebuildIndex");
}

module.exports = { rebuildIndex };
