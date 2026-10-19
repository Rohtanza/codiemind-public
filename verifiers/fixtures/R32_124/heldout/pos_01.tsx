import { useEffect, useState } from "react";

export async function InitializeTheme(): Promise<"light" | "dark"> {
  const saved = localStorage.getItem("theme");
  return saved === "dark" ? "dark" : "light";
}

export function ThemeBadge() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    InitializeTheme().then(setTheme);
  }, []);
  return <span className={`badge-${theme}`}>{theme}</span>;
}
