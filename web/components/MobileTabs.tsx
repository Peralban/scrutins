"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Bottom tab bar for phones: the four pages people come for within thumb reach,
// the rest behind "Plus". Hidden on wider screens, where the top <Nav> is used.
const PRIMARY = [
  ["/", "Stats", "M4 20V10M10 20V4M16 20v-8M22 20H2"],
  ["/hemicycle", "Hémicycle", "M3 18a9 9 0 0 1 18 0M7 18a5 5 0 0 1 10 0M3 18h18"],
  ["/themes", "Thèmes", "M4 5h16M4 12h16M4 19h10"],
  ["/notions", "Notions", "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"],
] as const;
const MORE = [["/depute", "Député"], ["/accords", "Accords"], ["/carte", "Carte"]] as const;

const isOn = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export default function MobileTabs() {
  const path = usePathname();
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (more.current) more.current.open = false; }, [path]);
  const moreOn = MORE.some(([href]) => isOn(path, href));
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {PRIMARY.map(([href, label, d]) => (
        <Link key={href} href={href} aria-current={isOn(path, href) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
          {label}
        </Link>
      ))}
      <details ref={more} className="tabbar-more">
        <summary aria-current={moreOn ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
          Plus
        </summary>
        <div className="tabbar-sheet">
          {MORE.map(([href, label]) => (
            <Link key={href} href={href} aria-current={isOn(path, href) ? "page" : undefined}>{label}</Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
