import { Firestore, Timestamp } from "@google-cloud/firestore";

const firestore = new Firestore({ projectId: "inventory-svc" });

export async function adjustStock(sku: string, delta: number): Promise<number> {
  const ref = firestore.collection("inventory").doc(sku);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = ((snap.get("qty") as number | undefined) ?? 0) + delta;
    tx.set(ref, { qty: next, updatedAt: Timestamp.now() }, { merge: true });
    return next;
  });
}
