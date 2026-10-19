import Image from "next/image";

export default function Team({ members }: { members: { id: string; photo: string; name: string }[] }) {
  if (members.length === 0) {
    return <Image src="/empty.svg" alt="No members" width={200} height={200} />;
  }
  return (
    <>
      {members.map((m) => (
        <figure key={m.id}>
          <Image src={m.photo} alt={m.name} width={96} height={96} />
          <figcaption>{m.name}</figcaption>
        </figure>
      ))}
    </>
  );
}
