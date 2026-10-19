import { Hono } from "jsr:@hono/hono";
import { z } from "zod";

const app = new Hono();
const Item = z.object({ sku: z.string(), qty: z.number() });

app.post("/items", async (c) => {
  const item = Item.parse(await c.req.json());
  return c.json({ ok: true, item });
});

Deno.serve(app.fetch);
