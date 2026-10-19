import Image from "next/image";

export function ProductCard({ title, image, badge }: { title: string; image: string; badge: string }) {
  return (
    <article>
      <Image src={image} alt={title} width={320} height={240} />
      <img className="badge" src={badge} alt="" />
      <h2>{title}</h2>
    </article>
  );
}
