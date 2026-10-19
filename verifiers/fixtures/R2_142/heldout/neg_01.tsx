import React from "react";

type CardProps = {
  title: string;
  body: string;
};

export const Card = ({ title, body }: CardProps) => (
  <section>
    <h2>{title}</h2>
    <p>{body}</p>
  </section>
);
