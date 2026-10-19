import { h } from 'preact';
import { useState } from 'preact/hooks';

export function Toggle() {
  const [on, setOn] = useState(false);
  return <button onClick={() => setOn(!on)}>{on ? 'On' : 'Off'}</button>;
}
