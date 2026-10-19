'use client';

// Opens docs in a new window via target="_blank"; no localStorage needed.
export function DocsLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Opens in a new window">
      Read the docs
    </a>
  );
}
