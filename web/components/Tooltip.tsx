"use client";

import { useEffect, useRef } from "react";

// One tooltip for anything carrying data-tip, whether server- or client-rendered.
// Follows the mouse on desktop; on touch screens a tap shows it and scrolling hides it.
export default function Tooltip() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const show = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-tip]") as HTMLElement | null;
      if (!t) { el.style.display = "none"; return; }
      el.textContent = t.dataset.tip ?? "";
      el.style.display = "block";
      el.style.left = Math.max(8, Math.min(e.clientX + 12, innerWidth - el.offsetWidth - 8)) + "px";
      el.style.top = Math.min(e.clientY + 14, innerHeight - el.offsetHeight - 8) + "px";
    };
    const move = (e: PointerEvent) => { if (e.pointerType === "mouse") show(e); };
    const down = (e: PointerEvent) => { if (e.pointerType !== "mouse") show(e); };
    const hide = () => { el.style.display = "none"; };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerdown", down);
    addEventListener("scroll", hide, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", down);
      removeEventListener("scroll", hide);
    };
  }, []);
  return <div id="tip" ref={ref} />;
}
