import React from "react";

type LinkProps = { to: string; children: React.ReactNode };

function Link({ to, children }: LinkProps) {
  return <a href={to} className="nav-link">{children}</a>;
}

export default function TopNav() {
  return (
    <nav>
      <Link to="/services/">Services</Link>
      <Link to="/team/">Team</Link>
    </nav>
  );
}
