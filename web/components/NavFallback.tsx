import Link from "next/link";
import { LINKS } from "./links";

// Same header as <Nav>, without the current-page marker: shown while the pathname is not yet known.
export default function NavFallback() {
  return (
    <header className="site-header">
      <Link href="/" className="logo">Scrutins</Link>
      <nav aria-label="Navigation principale">{LINKS.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    </header>
  );
}
