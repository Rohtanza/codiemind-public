import React from "react";
import { Link as GatsbyLink } from "gatsby";

interface Props { slug: string; label: string }

export const PostLink = ({ slug, label }: Props) => (
  <GatsbyLink to={`/blog/${slug}/`} className="post-link">
    {label}
  </GatsbyLink>
);
