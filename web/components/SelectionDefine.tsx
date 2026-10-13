"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

type Def =
  | { source: "glossaire"; mot: string; defs: string[]; site: string | null; href: string }
  | { source: "wiktionnaire"; mot: string; nature: string | null; defs: string[]; href: string }
  | { source: null; mot: string };

// Select a word anywhere in the page content: a small "Définition" button appears next to it.
// The answer comes from the glossary first, then from the French Wiktionary (through our API).
export default function SelectionDefine() {
  const [sel, setSel] = useState<{ word: string; x: number; y: number } | null>(null);
  const [def, setDef] = useState<Def | "loading" | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const read = () => {
      const s = getSelection();
      const text = s?.toString().trim() ?? "";
      const inMain = s?.anchorNode && (s.anchorNode.parentElement ?? null)?.closest("main");
      const field = document.activeElement?.matches("input, textarea, select");
      if (!s || s.rangeCount === 0 || !inMain || field || !text || text.length > 40 || text.split(/\s+/).length > 3 || /\d{4,}/.test(text)) { setSel(null); return; }
      const r = s.getRangeAt(0).getBoundingClientRect();
      setSel({ word: text, x: Math.max(8, Math.min(r.left, innerWidth - 120)), y: r.bottom + 8 });
      setDef(null);
    };
    let t: ReturnType<typeof setTimeout>;
    const later = () => { clearTimeout(t); t = setTimeout(read, 250); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setSel(null); setDef(null); } };
    document.addEventListener("selectionchange", later);
    addEventListener("keydown", esc);
    return () => { document.removeEventListener("selectionchange", later); removeEventListener("keydown", esc); clearTimeout(t); };
  }, []);

  if (!sel) return null;
  const ask = () => { setDef("loading"); api<Def>(`definition?mot=${encodeURIComponent(sel.word)}`).then(setDef).catch(() => setDef({ source: null, mot: sel.word })); };
  const left = Math.min(sel.x, innerWidth - (def ? 340 : 120));
  return (
    <div ref={box} className="define" style={{ left, top: def ? Math.min(sel.y, innerHeight * 0.45) : sel.y }} onMouseDown={(e) => e.preventDefault()}>
      {!def && <button type="button" onClick={ask}>Définition</button>}
      {def === "loading" && <p className="define-wait">Recherche…</p>}
      {def && def !== "loading" && (
        <div role="dialog" aria-label={`Définition de ${def.mot}`}>
          <button type="button" className="define-x" aria-label="Fermer" onClick={() => { setDef(null); setSel(null); }}>×</button>
          <p><b>{def.mot}</b>{def.source === "wiktionnaire" && def.nature ? <i> · {def.nature}</i> : null}</p>
          {def.source === null && <p className="define-none">Aucune définition trouvée pour « {def.mot} ».</p>}
          {def.source && <ol>{def.defs.map((d, i) => <li key={i}>{d}</li>)}</ol>}
          {def.source === "glossaire" && <>{def.site && <p className="define-site">Sur ce site : {def.site}</p>}<Link href={def.href}>Dans le glossaire →</Link></>}
          {def.source === "wiktionnaire" && <small>Source : <a href={def.href} target="_blank" rel="noreferrer">Wiktionnaire</a> (CC BY-SA)</small>}
        </div>
      )}
    </div>
  );
}
