import { z } from "npm:zod@3";

const Snippet = z.object({ code: z.string() });

export function badExample() {
  return Snippet.parse({
    code: 'import { z } from "zod";\nconst s = z.string();',
  });
}
