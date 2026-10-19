import { createElement } from "react";
import { AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";

const statusIcons: Record<"ok" | "warn", LucideIcon> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
};

export function renderStatusIcon(status: "ok" | "warn") {
  return createElement(statusIcons[status], { size: 14, "aria-hidden": true });
}
