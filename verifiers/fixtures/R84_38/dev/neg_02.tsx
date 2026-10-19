import { useRouter } from "next/router";

export default function LoginButton() {
  const router = useRouter();

  const handleLogin = async () => {
    await fetch("/api/login", { method: "POST" });
    router.push("/dashboard");
  };

  return <button onClick={handleLogin}>Log in</button>;
}
