import { Suspense } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={<p>Loading…</p>}>{children}</Suspense>
      <Footer />
    </>
  );
}
