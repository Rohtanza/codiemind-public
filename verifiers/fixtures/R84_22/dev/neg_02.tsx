import { useState, type FormEvent } from "react";

export function FeedbackForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const comment = String(data.get("comment") ?? "");
    const next: Record<string, string> = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Invalid email";
    if (comment.trim().length < 5) next.comment = "Comment is too short";
    setErrors(next);
    if (Object.keys(next).length === 0) console.log("submitted", { email, comment });
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="email" />
      {errors.email && <span>{errors.email}</span>}
      <textarea name="comment" />
      {errors.comment && <span>{errors.comment}</span>}
      <button>Send</button>
    </form>
  );
}
