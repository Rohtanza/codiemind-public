import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore();

export async function getProfile(userId: string) {
  const snap = await getDoc(doc(db, "profiles", userId));
  return snap.exists() ? snap.data() : null;
}
