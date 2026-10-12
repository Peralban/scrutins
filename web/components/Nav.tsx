"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LINKS } from "./links";

export default function Nav() {
  const path = usePathname();
  return (
    <nav>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
