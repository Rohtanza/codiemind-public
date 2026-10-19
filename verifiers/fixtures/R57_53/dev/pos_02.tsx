"use client";

import { useEffect, useState } from "react";

export default function ViewportWidth() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <span>{width}px</span>;
}
