// Previously this file did: import { createClient } from "@supabase/supabase-js";
// Deno edge functions need explicit specifiers, so it was switched over.
import { createClient } from "npm:@supabase/supabase-js@2";

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
