import { slugify } from "./utils/slugify.ts";
import type { Post } from "../types.ts";

export function postUrl(post: Post): string {
  return `/blog/${slugify(post.title)}`;
}
