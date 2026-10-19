import { Hono } from "jsr:@hono/hono";
import { z } from "npm:zod@3.23.8";
import { formatUser } from "./format.ts";

const app = new Hono();
const User = z.object({ name: z.string() });

app.post("/users", async (c) => {
  const user = User.parse(await c.req.json());
  return c.json(formatUser(user));
});

Deno.serve(app.fetch);
