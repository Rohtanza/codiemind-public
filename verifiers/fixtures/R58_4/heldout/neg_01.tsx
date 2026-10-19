import React, { useState } from "react";

export function ScoreSummary({ scores }: { scores: number[] }) {
  const [open, setOpen] = useState(false);

  const analyzeScores = () => {
    const best = Math.max(...scores);
    return `Best score: ${best}`;
  };

  return (
    <section>
      <button onClick={() => setOpen(!open)}>Toggle summary</button>
      {open && <p>{analyzeScores()}</p>}
    </section>
  );
}
