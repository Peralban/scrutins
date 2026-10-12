"use client";

import { useEffect, useRef } from "react";

// One tooltip for anything carrying data-tip, whether server- or client-rendered.
export default function Tooltip() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const move = (e: MouseEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-tip]") as HTMLElement | null;
      if (!t) { el.style.display = "none"; return; }
      el.textContent = t.dataset.tip ?? "";
      el.style.display = "block";
      el.style.left = Math.min(e.clientX + 12, innerWidth - el.offsetWidth - 8) + "px";
      el.style.top = e.clientY + 14 + "px";
    };
    document.addEventListener("mousemove", move);
    return () => document.removeEventListener("mousemove", move);
  }, []);
  return <div id="tip" ref={ref} />;
}
