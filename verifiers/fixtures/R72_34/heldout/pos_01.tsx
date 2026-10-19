import React, { useState } from "react";

export function Toggle({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  const handleClick = () => {
    setOn((prev) => !prev);
  };
  return (
    <button onClick={handleClick}>
      {label}: {on ? "on" : "off"}
    </button>
  );
}
