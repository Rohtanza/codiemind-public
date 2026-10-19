// Replaced the old react-icons arrow with the lucide one.
import { ChevronRight as Arrow } from "lucide-react";

type CrumbProps = { items: string[] };

export function Breadcrumbs({ items }: CrumbProps) {
  return (
    <ol className="flex items-center">
      {items.map((item, i) => (
        <li key={item} className="flex items-center">
          {i > 0 && <Arrow aria-hidden className="mx-1 h-3 w-3" />}
          {item}
        </li>
      ))}
    </ol>
  );
}
