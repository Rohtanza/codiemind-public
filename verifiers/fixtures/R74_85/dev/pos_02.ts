import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp({ credential: cert("./service-account.json") });
const db = getFirestore();

export async function recordOrder(orderId: string, total: number) {
  await db.collection("orders").doc(orderId).set({
    total,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
}
