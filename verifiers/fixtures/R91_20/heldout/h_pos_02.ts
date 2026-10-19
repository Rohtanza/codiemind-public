import { signUp, confirmSignUp } from "aws-amplify/auth";

export async function register(email: string, password: string) {
  const { userId, nextStep } = await signUp({
    username: email,
    password,
    options: { userAttributes: { email } },
  });
  return { userId, step: nextStep.signUpStep };
}

export async function confirm(email: string, code: string) {
  const { isSignUpComplete } = await confirmSignUp({ username: email, confirmationCode: code });
  return isSignUpComplete;
}
