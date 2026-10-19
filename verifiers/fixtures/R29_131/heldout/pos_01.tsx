import React from "react";

type Props = { src: string; alt: string };

export function Avatar({ src, alt }: Props) {
  const handleError = () => {
    console.error(`Avatar image failed to load: ${src}`);
  };
  return <img src={src} alt={alt} onError={handleError} width={40} height={40} />;
}
