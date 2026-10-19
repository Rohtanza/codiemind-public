import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function DrawingEditor() {
  const navigate = useNavigate();
  const [strokes, setStrokes] = useState<string[]>([]);

  const history = {
    stack: [] as string[][],
    pushState(snapshot: string[]) {
      this.stack.push(snapshot);
    },
  };

  const addStroke = (s: string) => {
    history.pushState(strokes);
    setStrokes([...strokes, s]);
  };

  return (
    <div>
      <canvas onClick={() => addStroke("line")} />
      <button onClick={() => navigate("/gallery")}>Done</button>
    </div>
  );
}
