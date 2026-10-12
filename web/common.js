export const $ = (s) => document.querySelector(s);
export const fmt = new Intl.NumberFormat("fr-FR");
export const pct = (n) => n.toFixed(1).replace(".", ",") + " %";
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const NEUTRAL = "#8d949a";
export const api = (path) => fetch("/api/" + path).then((r) => r.json());

// One tooltip for anything carrying data-tip.
const tip = document.getElementById("tip");
document.addEventListener("mousemove", (e) => {
  const t = e.target.closest?.("[data-tip]");
  if (!t) { tip.style.display = "none"; return; }
  tip.textContent = t.dataset.tip; tip.style.display = "block";
  tip.style.left = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8) + "px";
  tip.style.top = e.clientY + 14 + "px";
});
