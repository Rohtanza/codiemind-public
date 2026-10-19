import React from "react";

interface IButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export function Button({ label, disabled = false, onClick }: IButtonProps) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
