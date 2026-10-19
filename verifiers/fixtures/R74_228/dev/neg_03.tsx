type Post = { id: number; cover: string; title: string };

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          {post.cover ? <img src={post.cover} alt={post.title} loading="lazy"></img> : null}
          <p>{post.title}</p>
        </div>
      ))}
    </div>
  );
}
