import Image from "next/image";

export default function Hero() {
  return (
    <section className="hero">
      <Image src="/hero.jpg" alt="Mountain view" width={1200} height={600} priority />
      <h1>Welcome</h1>
    </section>
  );
}
