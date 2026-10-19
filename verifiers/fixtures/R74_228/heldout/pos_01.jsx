import Img from "next/image";
import logo from "../public/logo.png";

export default function Header() {
  return (
    <header>
      <Img src={logo} alt="Company logo" placeholder="blur" />
      <nav>Home</nav>
    </header>
  );
}
