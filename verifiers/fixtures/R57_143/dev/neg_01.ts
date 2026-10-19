import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

export async function getProfile(id: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return data;
}
