import { getFirestore, collection, addDoc } from "firebase/firestore";
import { DataSnapshot } from "firebase/database";

const db = getFirestore();

// One-off migration: legacy Realtime Database exports are copied into Firestore.
export async function migrateSnapshot(snap: DataSnapshot): Promise<string> {
  const payload = snap.val() as Record<string, unknown>;
  const created = await addDoc(collection(db, "legacyItems"), payload);
  return created.id;
}
