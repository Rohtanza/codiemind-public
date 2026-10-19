import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

export function ProfileBadge({ name }: { name: string }) {
  return (
    <span className="badge">
      <FontAwesomeIcon icon={faUser} className="mr-1" />
      {name}
    </span>
  );
}
