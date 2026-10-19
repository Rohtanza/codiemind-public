/** @jsxImportSource vue */
import type { FunctionalComponent } from 'vue';

interface AvatarProps {
  src: string;
  size?: number;
}

export const Avatar: FunctionalComponent<AvatarProps> = (props) => (
  <img src={props.src} width={props.size ?? 32} height={props.size ?? 32} class="avatar" />
);
