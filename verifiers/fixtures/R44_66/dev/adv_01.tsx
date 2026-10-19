import React from "react";

/*
  Migrated from the old pattern:
  export default Avatar;
  Auto-imports now resolve the same name everywhere.
*/

type AvatarProps = { src: string; alt: string; size?: number };

export const Avatar = ({ src, alt, size = 32 }: AvatarProps) => (
  <img src={src} alt={alt} width={size} height={size} className="avatar" />
);
