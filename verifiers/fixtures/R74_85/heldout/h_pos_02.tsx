import { useEffect, useState } from "react";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

export function LiveScore({ matchId }: { matchId: string }) {
  const [score, setScore] = useState<string>("-");

  useEffect(() => {
    const unsub = onSnapshot(doc(getFirestore(), "matches", matchId), (snap) => {
      setScore(`${snap.get("home")} : ${snap.get("away")}`);
    });
    return unsub;
  }, [matchId]);

  return <span className="score">{score}</span>;
}
