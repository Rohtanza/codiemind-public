'use client';

type Props = { text: string };

export function CopyButton({ text }: Props) {
  async function copy() {
    await navigator.clipboard.writeText(text);
  }

  return (
    <button type="button" onClick={copy}>
      Copy
    </button>
  );
}
