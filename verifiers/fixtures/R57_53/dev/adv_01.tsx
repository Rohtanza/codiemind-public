'use client';

import { document } from '@/lib/cms';

type Props = { slug: string };

export function DocumentTitle({ slug }: Props) {
  const entry = document(slug);

  return (
    <section>
      <h1>{entry.title}</h1>
      <p>{entry.summary}</p>
    </section>
  );
}
