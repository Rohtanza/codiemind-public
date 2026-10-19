import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const app = initializeApp({ projectId: "demo-app" });
const db = getFirestore(app);

export async function saveProfile(uid: string, name: string, email: string): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    name,
    email,
    updatedAt: serverTimestamp(),
  });
}
