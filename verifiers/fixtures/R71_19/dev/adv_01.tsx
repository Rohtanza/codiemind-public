import { IconType } from "react-icons";
import { Download, Upload } from "lucide-react";

interface ToolbarButtonProps {
  icon: IconType;
  label: string;
  onClick: () => void;
}

function ToolbarButton({ icon: Icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button onClick={onClick} title={label}>
      <Icon size={16} />
    </button>
  );
}

export function FileToolbar({ onImport, onExport }: { onImport: () => void; onExport: () => void }) {
  return (
    <div>
      <ToolbarButton icon={Upload} label="Import" onClick={onImport} />
      <ToolbarButton icon={Download} label="Export" onClick={onExport} />
    </div>
  );
}
