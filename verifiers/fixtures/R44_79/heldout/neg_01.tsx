import React from "react";
import Link from "next/link";

const Menu = () => (
  <ul>
    <li><Link href="/pricing">Pricing</Link></li>
    <li><Link href="/contact">Contact</Link></li>
  </ul>
);

export default Menu;
