import React from "react";
import { Link } from "gatsby";

const Footer = () => (
  <footer>
    <Link to="/privacy/" activeClassName="active">Privacy</Link>
    <a href="https://github.com/example/site">Source on GitHub</a>
    <a href="mailto:hello@example.com">Contact</a>
  </footer>
);

export default Footer;
