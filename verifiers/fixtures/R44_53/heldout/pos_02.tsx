import { Suspense } from "react";
import loadable from "next/dynamic";

const VideoPlayer = loadable(() => import("@/components/video-player"));
const Fallback = () => <div className="aspect-video animate-pulse" />;

export default function Lesson({ url, locked }: { url: string; locked: boolean }) {
  return (
    <Suspense fallback={<Fallback />}>
      {locked ? <p>Enroll to watch.</p> : <VideoPlayer src={url} autoPlay={false} />}
    </Suspense>
  );
}
