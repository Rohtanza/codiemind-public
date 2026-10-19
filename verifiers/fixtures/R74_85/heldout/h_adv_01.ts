import { getFirestore, doc, setDoc, getDoc, Firestore } from "firebase/firestore";

class FirestoreKeyValue {
  constructor(private readonly db: Firestore, private readonly space: string) {}

  async setItem(key: string, value: string): Promise<void> {
    await setDoc(doc(this.db, this.space, key), { value });
  }

  async getItem(key: string): Promise<string | null> {
    const snap = await getDoc(doc(this.db, this.space, key));
    return snap.exists() ? (snap.get("value") as string) : null;
  }
}

export async function rememberDraft(sessionStorage: FirestoreKeyValue, draftId: string, text: string) {
  await sessionStorage.setItem(draftId, text);
}

export const drafts = new FirestoreKeyValue(getFirestore(), "drafts");
