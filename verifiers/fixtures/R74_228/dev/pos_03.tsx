import Image from "next/image";

const photos = [
  { src: "/a.jpg", alt: "Beach" },
  { src: "/b.jpg", alt: "Forest" },
];

export default function Gallery() {
  return (
    <ul className="grid">
      {photos.map((p) => (
        <li key={p.src} style={{ position: "relative", height: 200 }}>
          <Image src={p.src} alt={p.alt} fill sizes="(max-width: 768px) 100vw, 33vw" />
        </li>
      ))}
    </ul>
  );
}
