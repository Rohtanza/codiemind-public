import { FaGithub, FaTwitter } from "react-icons/fa";

export function SocialLinks() {
  return (
    <footer className="flex gap-4">
      <a href="https://github.com/acme" aria-label="GitHub">
        <FaGithub size={20} />
      </a>
      <a href="https://twitter.com/acme" aria-label="Twitter">
        <FaTwitter size={20} />
      </a>
    </footer>
  );
}
