import React from "react";
import { Link } from "react-router-dom";

const Nav = () => (
  <nav>
    <Link to="/blog">Blog</Link>
    <Link to="/tags">Tags</Link>
  </nav>
);

export default Nav;
