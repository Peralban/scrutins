"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LINKS } from "./links";

// Site header: logo, links, and on phones a menu button that opens the same links as a panel
// (no bottom tab bar: the links stay where people expect them, at the top).
export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="site-header">
      <Link href="/" className="logo">Scrutins</Link>
      <nav className={open ? "open" : undefined} id="site-nav" aria-label="Navigation principale">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} aria-current={on(href) ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <button type="button" className="menu" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
        <span className="sr-only">Menu</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
      </button>
    </header>
  );
}
