import React, { forwardRef, memo } from "react";

export const TextInput = forwardRef(function TextInput({ label, ...rest }, ref) {
  return (
    <label className="field">
      <span>{label}</span>
      <input ref={ref} {...rest} />
    </label>
  );
});

export const Avatar = memo(({ src, size = 32 }) => (
  <img className="avatar" src={src} width={size} height={size} alt="" />
));
