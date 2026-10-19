import React from "react";

type CardProps = {
  title: string;
  body: string;
};

export function Card({ title, body }: CardProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
