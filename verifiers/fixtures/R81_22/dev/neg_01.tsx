import React, { useState } from 'react';

export function CounterButton({ step = 1 }: { step?: number }) {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + step)}>
      Clicked {count} times
    </button>
  );
}
