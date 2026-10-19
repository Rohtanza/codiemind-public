import { Bell } from "lucide-react";
import DeleteIcon from "@mui/icons-material/Delete";

export function NotificationRow({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Bell className="h-4 w-4" />
      <span>{text}</span>
      <button onClick={onDismiss}>
        <DeleteIcon fontSize="small" />
      </button>
    </div>
  );
}
