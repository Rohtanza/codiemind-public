import { db } from '@/lib/db';

export default async function PostsPage() {
  const posts = await db.post.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <main>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </main>
  );
}
