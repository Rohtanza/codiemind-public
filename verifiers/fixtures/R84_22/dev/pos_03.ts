import * as z from "zod";

const newsletterSchema = z.object({
  email: z.string().trim().email(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
});

const form = document.querySelector<HTMLFormElement>("#newsletter")!;
const errorBox = document.querySelector<HTMLElement>("#newsletter-error")!;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const parsed = newsletterSchema.safeParse(values);
  if (!parsed.success) {
    errorBox.textContent = parsed.error.issues.map((i) => i.message).join(", ");
    return;
  }
  errorBox.textContent = "";
  void fetch("/api/newsletter", { method: "POST", body: JSON.stringify(parsed.data) });
});
