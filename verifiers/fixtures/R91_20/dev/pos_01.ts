import { Amplify } from "aws-amplify";
import { signIn, signOut } from "aws-amplify/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.USER_POOL_ID!,
      userPoolClientId: process.env.USER_POOL_CLIENT_ID!,
    },
  },
});

export async function login(email: string, password: string): Promise<boolean> {
  const { isSignedIn } = await signIn({ username: email, password });
  return isSignedIn;
}

export async function logout(): Promise<void> {
  await signOut();
}
