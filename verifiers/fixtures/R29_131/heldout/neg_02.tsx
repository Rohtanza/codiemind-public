import React, { useState } from "react";

export function Counter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);

  const increment = () => {
    debugger;
    setCount((c) => c + 1);
  };

  return <button onClick={increment}>Clicked {count} times</button>;
}
