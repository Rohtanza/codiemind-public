import { z } from "zod";

// Response shape returned by GET /api/profile
export const ProfileResponse = z.object({ id: z.string(), displayName: z.string() });

export function validateProfileForm(form: HTMLFormElement) {
  const z = {
    required: (v: string) => v.trim().length > 0,
    maxLen: (v: string, n: number) => v.length <= n,
  };
  const name = (form.elements.namedItem("displayName") as HTMLInputElement).value;
  const bio = (form.elements.namedItem("bio") as HTMLTextAreaElement).value;
  const errors: string[] = [];
  if (!z.required(name)) errors.push("Display name is required");
  if (!z.maxLen(bio, 160)) errors.push("Bio must be 160 characters or fewer");
  return errors;
}
