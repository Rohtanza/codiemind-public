import { getFirestore, collection, query, where, onSnapshot, Unsubscribe } from "firebase/firestore";

interface Message {
  id: string;
  text: string;
}

export function subscribeToRoom(roomId: string, onChange: (msgs: Message[]) => void): Unsubscribe {
  const db = getFirestore();
  const q = query(collection(db, "messages"), where("roomId", "==", roomId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, text: d.data().text as string })));
  });
}
