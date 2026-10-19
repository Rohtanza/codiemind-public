import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "my-app.firebaseapp.com",
});
const auth = getAuth(app);

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user.getIdToken();
}
