import Image from "react-bootstrap/Image";

export default function Banner() {
  return (
    <div className="banner">
      <Image src="/banner.png" alt="Sale banner" fluid rounded />
    </div>
  );
}
