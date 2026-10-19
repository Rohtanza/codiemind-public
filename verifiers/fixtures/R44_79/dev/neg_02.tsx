import React from "react";
import { Link } from "gatsby";

export default function Sidebar() {
  return (
    <aside>
      <Link to="/docs/">Docs</Link>
      <a href="/docs/getting-started/">Getting started</a>
    </aside>
  );
}
