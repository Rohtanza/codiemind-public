import React, { useState } from "react";
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";

export function PhotoUploader({ uid }: { uid: string }) {
  const [progress, setProgress] = useState(0);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const task = uploadBytesResumable(ref(getStorage(), `photos/${uid}/${file.name}`), file);
    task.on("state_changed", (s) => setProgress((s.bytesTransferred / s.totalBytes) * 100));
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={onChange} />
      <progress value={progress} max={100} />
    </div>
  );
}
