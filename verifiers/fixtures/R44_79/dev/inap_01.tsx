import * as React from "react";

type Props = { title: string; children: React.ReactNode };

// Navigation is handled by the Layout; this card has no links.
const Card = ({ title, children }: Props) => (
  <section className="card">
    <h2>{title}</h2>
    <div>{children}</div>
    <a href="https://www.gatsbyjs.com/docs/">Gatsby docs</a>
  </section>
);

export default Card;
