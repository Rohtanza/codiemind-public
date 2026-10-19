import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function addComment(postId: string, body: string) {
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}
