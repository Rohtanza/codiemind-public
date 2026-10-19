import { Home, Settings, Users } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <nav>
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}>
          <Icon size={18} /> {label}
        </Link>
      ))}
    </nav>
  );
}
