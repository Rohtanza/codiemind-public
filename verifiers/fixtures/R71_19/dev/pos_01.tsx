import { Save, Trash2 } from "lucide-react";

export function EditorActions({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onSave}>
        <Save className="h-4 w-4" /> Save
      </button>
      <button onClick={onDelete}>
        <Trash2 className="h-4 w-4" /> Delete
      </button>
    </div>
  );
}
