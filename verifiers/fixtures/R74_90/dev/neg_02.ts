import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export async function uploadDocument(userId: string, file: File) {
  const { data, error } = await supabase.storage
    .from("documents")
    .upload(`${userId}/${file.name}`, file, { upsert: true });
  if (error) throw error;
  return data.path;
}
