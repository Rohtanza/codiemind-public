export interface ArticleDto {
  readonly slug: string;
  readonly title: string;
  readonly tags: readonly string[];
}

export function createArticleDto(slug: string, title: string, tags: string[]): ArticleDto {
  return Object.freeze({ slug, title, tags: Object.freeze([...tags]) });
}

export function addTag(article: ArticleDto, tag: string): ArticleDto {
  return createArticleDto(article.slug, article.title, [...article.tags, tag]);
}
