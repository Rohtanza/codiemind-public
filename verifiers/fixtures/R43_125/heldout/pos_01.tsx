import React from "react";

interface BaseProps {
  className?: string;
}

interface ButtonProps extends BaseProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick, className }: ButtonProps) {
  return <button className={className} onClick={onClick}>{label}</button>;
}
