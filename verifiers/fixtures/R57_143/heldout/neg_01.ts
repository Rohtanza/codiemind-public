import type { Database } from "./database.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function countRows(
  client: SupabaseClient<Database>,
  table: keyof Database["public"]["Tables"],
): Promise<number> {
  const { count } = await client.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}
