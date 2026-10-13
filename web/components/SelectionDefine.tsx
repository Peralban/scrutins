"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

type Def =
  | { source: "glossaire"; mot: string; defs: string[]; contexte: string | null; site: string | null; sources: { nom: string; url: string }[]; href: string }
  | { source: null; mot: string };

// Select a word anywhere in the page content: a small "Définition" button appears next to it.
// The answer comes from the site's glossary only; a word that is not in it says so.
export default function SelectionDefine() {
  const [sel, setSel] = useState<{ word: string; x: number; y: number } | null>(null);
  const [def, setDef] = useState<Def | "loading" | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const request = useRef(0);

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
    const close = () => { request.current++; setSel(null); setDef(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("selectionchange", later);
    addEventListener("keydown", esc);
    addEventListener("scroll", close, { passive: true }); // the box is fixed: it would drift away from its word
    return () => { document.removeEventListener("selectionchange", later); removeEventListener("keydown", esc); removeEventListener("scroll", close); clearTimeout(t); };
  }, []);

  useEffect(() => { if (def && def !== "loading") card.current?.focus(); }, [def]);

  if (!sel) return null;
  const ask = () => {
    const id = ++request.current;
    setDef("loading");
    // A late answer for an earlier selection is dropped.
    api<Def>(`definition?mot=${encodeURIComponent(sel.word)}`).then((d) => { if (id === request.current) setDef(d); })
      .catch(() => { if (id === request.current) setDef({ source: null, mot: sel.word }); });
  };
  const left = Math.min(sel.x, innerWidth - (def ? 340 : 120));
  return (
    <div className="define" style={{ left, top: def ? Math.min(sel.y, innerHeight * 0.45) : sel.y }} onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.stopPropagation()} aria-live="polite">
      {!def && <button type="button" onClick={ask}>Définition</button>}
      {def === "loading" && <p className="define-wait">Recherche…</p>}
      {def && def !== "loading" && (
        <div ref={card} tabIndex={-1} role="dialog" aria-label={`Définition de ${def.mot}`}>
          <button type="button" className="define-x" aria-label="Fermer" onClick={() => { request.current++; setDef(null); setSel(null); }}>×</button>
          <p><b>{def.mot}</b></p>
          {def.source === null && <p className="define-none">Pas de définition pour « {def.mot} » dans le glossaire.</p>}
          {def.source === "glossaire" && (
            <>
              {def.contexte && <p className="define-site">{def.contexte}</p>}
              <ol>{def.defs.map((d, i) => <li key={i}>{d}</li>)}</ol>
              {def.site && <p className="define-site">Sur ce site : {def.site}</p>}
              {def.sources.length > 0 && (
                <small>Sources : {def.sources.map((s, i) => <span key={s.url}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noreferrer">{s.nom}</a></span>)}</small>
              )}
              <Link href={def.href}>Dans le glossaire →</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
