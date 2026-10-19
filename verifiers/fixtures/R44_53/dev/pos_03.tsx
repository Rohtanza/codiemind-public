import { Suspense, lazy } from "react";

const CommentList = lazy(() => import("./CommentList"));
const LikeButton = lazy(() => import("./LikeButton"));

export function Post({ id }: { id: string }) {
  return (
    <article>
      <Suspense fallback={<p>Loading…</p>}>
        <div className="actions">
          <LikeButton postId={id} />
        </div>
      </Suspense>
      <Suspense fallback={<p>Loading comments…</p>}>
        <CommentList postId={id} />
      </Suspense>
    </article>
  );
}
