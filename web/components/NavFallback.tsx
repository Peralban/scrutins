import Link from "next/link";
import { LINKS } from "./links";

// Same links as <Nav>, without the current-page marker: shown while the pathname is not yet known.
export default function NavFallback() {
  return <nav>{LINKS.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>;
}
