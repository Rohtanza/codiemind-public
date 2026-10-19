import { logger } from "@/lib/logger";

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  logger.info("slug created", { slug });
  return slug;
}
