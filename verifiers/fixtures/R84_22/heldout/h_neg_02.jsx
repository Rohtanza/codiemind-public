import { useRef, useState } from "react";

export default function PasswordResetForm({ onReset }) {
  const formRef = useRef(null);
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = formRef.current;
    const pw = form.elements.password;
    const confirm = form.elements.confirm;
    confirm.setCustomValidity(pw.value === confirm.value ? "" : "Passwords do not match");
    if (!form.checkValidity()) {
      setMessage(form.querySelector(":invalid").validationMessage);
      return;
    }
    onReset(pw.value);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <input name="password" type="password" minLength={12} required />
      <input name="confirm" type="password" required />
      {message && <p role="alert">{message}</p>}
      <button>Reset password</button>
    </form>
  );
}
