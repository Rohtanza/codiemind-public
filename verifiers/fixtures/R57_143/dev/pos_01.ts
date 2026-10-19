import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

export async function listTodos() {
  const { data, error } = await supabase.from("todos").select("*");
  if (error) throw error;
  return data;
}
