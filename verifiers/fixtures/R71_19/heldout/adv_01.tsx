import type { ComponentType } from "react";
import { IconBaseProps } from "react-icons/lib";
import { Camera, Mic, Video } from "lucide-react";

const deviceIcons = {
  camera: Camera,
  microphone: Mic,
  screen: Video,
} satisfies Record<string, ComponentType<IconBaseProps>>;

export function DeviceChip({ kind }: { kind: keyof typeof deviceIcons }) {
  const Icon = deviceIcons[kind];
  return (
    <span className="chip">
      <Icon size={14} /> {kind}
    </span>
  );
}
