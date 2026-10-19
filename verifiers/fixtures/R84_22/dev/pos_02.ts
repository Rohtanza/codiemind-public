"use server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
});

export async function submitContact(formData: FormData) {
  const result = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!result.success) {
    return { ok: false, errors: result.error.flatten().fieldErrors };
  }
  await saveMessage(result.data);
  return { ok: true };
}

declare function saveMessage(m: z.infer<typeof contactSchema>): Promise<void>;
