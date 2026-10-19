import React from "react";
import { Link, graphql } from "gatsby";

export default function BlogIndex({ data }: { data: any }) {
  return (
    <ul>
      {data.allMarkdownRemark.nodes.map((post: any) => (
        <li key={post.id}>
          <Link to={post.fields.slug}>{post.frontmatter.title}</Link>
        </li>
      ))}
    </ul>
  );
}

export const query = graphql`
  query { allMarkdownRemark { nodes { id fields { slug } frontmatter { title } } } }
`;
