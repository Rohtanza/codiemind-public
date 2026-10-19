import { Suspense } from "react";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("@/components/rich-editor"), { ssr: false });

export default function NewPostPage() {
  return (
    <Suspense>
      <RichEditor placeholder="Write something…" />
    </Suspense>
  );
}
