import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue } from "firebase/database";

const app = initializeApp({ databaseURL: "https://demo-app.firebaseio.com" });
const rtdb = getDatabase(app);

export function sendMessage(roomId: string, text: string) {
  return push(ref(rtdb, `rooms/${roomId}/messages`), { text, sentAt: Date.now() });
}

export function watchRoom(roomId: string, cb: (value: unknown) => void) {
  return onValue(ref(rtdb, `rooms/${roomId}/messages`), (snap) => cb(snap.val()));
}
