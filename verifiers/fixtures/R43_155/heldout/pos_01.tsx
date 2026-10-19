import React, { useState } from "react";

export function UploadButton({ onUpload }: { onUpload: (f: File) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onUpload(file);
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }
  };
  return (
    <div>
      <input type="file" onChange={handle} />
      {error && <p>{error}</p>}
    </div>
  );
}
