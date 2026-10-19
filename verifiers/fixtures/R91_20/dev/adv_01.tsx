import { useState } from "react";
import { signIn } from "aws-amplify/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const signIn = async (body: { email: string; password: string }) =>
      fetch("/api/login", { method: "POST", body: JSON.stringify(body) });
    await signIn({ email, password });
  }

  return (
    <form onSubmit={onSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Sign in</button>
    </form>
  );
}
