import React from "react";
import { Link } from "gatsby";

export default function Tags({ tags }) {
  return (
    <p>
      <Link to="/tags/">All tags</Link>:{" "}
      {tags.map((t) => (
        <a key={t} href={`/tags/${t}/`}>{t}</a>
      ))}
    </p>
  );
}
