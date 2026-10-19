import Image from "next/image";

export default function Article({ body }: { body: string }) {
  return (
    <main>
      <Image src="/cover.jpg" alt="Cover" width={800} height={400} />
      <p>{body}</p>
      <picture>
        <source srcSet="/chart.webp" type="image/webp" />
        <img src="/chart.png" alt="Sales chart" />
      </picture>
    </main>
  );
}
