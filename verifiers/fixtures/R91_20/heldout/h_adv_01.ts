import {
  signIn as signInWithEmailAndPassword,
  signUp as createUserWithEmailAndPassword,
} from "aws-amplify/auth";

export async function login(email: string, password: string) {
  const result = await signInWithEmailAndPassword({ username: email, password });
  return result.isSignedIn;
}

export async function register(email: string, password: string) {
  const result = await createUserWithEmailAndPassword({ username: email, password });
  return result.userId;
}
