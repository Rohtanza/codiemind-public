import NextImage from "next/image";

type Props = { name: string; avatarUrl: string };

export function Avatar({ name, avatarUrl }: Props) {
  return (
    <div className="avatar">
      <NextImage src={avatarUrl} alt={name} width={48} height={48} />
      <span>{name}</span>
    </div>
  );
}
