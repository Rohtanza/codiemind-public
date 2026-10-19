import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import { getSession } from "./session";

export async function protectedLoader({ request }: LoaderFunctionArgs) {
  const session = await getSession();
  if (!session) {
    const from = new URL(request.url).pathname;
    return redirect(`/login?from=${encodeURIComponent(from)}`);
  }
  return { user: session.user };
}
