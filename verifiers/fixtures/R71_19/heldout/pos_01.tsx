import * as Icons from "lucide-react";

type IconName = "Sun" | "Moon" | "Monitor";

export function ThemeOption({ name, label }: { name: IconName; label: string }) {
  const Glyph = Icons[name];
  return (
    <label className="flex items-center gap-2">
      <Glyph className="h-4 w-4" />
      {label}
    </label>
  );
}
