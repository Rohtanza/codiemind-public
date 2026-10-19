import * as React from "react";
import { Link } from "@reach/router";

// Uses <Link to="..."> for internal pages, like Gatsby's Link.
const Breadcrumbs = () => (
  <ol>
    <li><Link to="/">Home</Link></li>
    <li><Link to="/products/">Products</Link></li>
  </ol>
);

export default Breadcrumbs;
