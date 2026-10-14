import { Hono } from "hono";
import { statSync } from "node:fs";
import { DB_PATH, open, queries } from "./stats";
import { ask, search } from "./search";
import { define } from "./definition";
import { signaler } from "./signalement";

// The nightly ingest swaps the file atomically; reopen when it changes.
let db = open(), mtime = statSync(DB_PATH).mtimeMs;
const fresh = () => {
  const m = statSync(DB_PATH).mtimeMs;
  if (m !== mtime) { db.close(); db = open(); mtime = m; }
  return db;
};
const app = new Hono();

app.get("/api/search", (c) => c.json(search(fresh(), c.req.query("q") ?? "", 10)));
app.get("/api/definition", (c) => c.json(define(c.req.query("mot") ?? "")));
// The front proxies /api through Next, which forwards the reader's address in x-forwarded-for.
app.post("/api/signalement", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const { status, reponse } = await signaler(body && typeof body === "object" ? body : {}, ip);
  return c.json(reponse, status as 200);
});
app.get("/api/ask", (c) => c.json(ask(fresh(), c.req.query("q") ?? "")));
app.get("/api/groupe/:id", (c) => {
  const g = queries.groupe(fresh(), c.req.param("id"));
  return g ? c.json(g) : c.json({ error: "not found" }, 404);
});
app.get("/api/hier", (c) => c.json(queries.hier(fresh())));
app.get("/api/overview", (c) => c.json(queries.overview(fresh())));
app.get("/api/groupes", (c) => c.json(queries.groupes(fresh())));
app.get("/api/mensuel", (c) => c.json(queries.mensuel(fresh())));
app.get("/api/deputes", (c) =>
  c.json(queries.deputes(fresh(), Math.min(+(c.req.query("limit") ?? 2000), 2000), +(c.req.query("min") ?? 50))));
app.get("/api/scrutins", (c) =>
  c.json(queries.scrutins(fresh(), {
    q: c.req.query("q"), theme: c.req.query("theme"), kind: c.req.query("kind"),
    limit: Math.min(+(c.req.query("limit") ?? 100), 500),
  })));
app.get("/api/themes", (c) => c.json(queries.themes(fresh(), c.req.query("scope") === "tous" ? "tous" : "ensemble")));
app.get("/api/depute/:id", (c) => {
  const r = queries.depute(fresh(), c.req.param("id"), c.req.query("kind") ?? "");
  return r ? c.json(r) : c.json({ error: "not found" }, 404);
});
app.get("/api/accords/groupes", (c) =>
  c.json(queries.accordGroupes(fresh(), c.req.query("scope") === "tous" ? "tous" : "ensemble", c.req.query("theme") ?? "")));
app.get("/api/accords/depute/:id", (c) =>
  c.json(queries.accordDepute(fresh(), c.req.param("id"), {
    horsGroupe: c.req.query("hors") === "1", min: Math.max(+(c.req.query("min") ?? 100), 20), kind: c.req.query("kind") ?? "",
  })));
app.get("/api/accords/duo/:a/:b", (c) => {
  const r = queries.accordDuo(fresh(), c.req.param("a"), c.req.param("b"), c.req.query("kind") ?? "");
  return r ? c.json(r) : c.json({ error: "not found" }, 404);
});
app.get("/api/carte", (c) => {
  const r = queries.carte(fresh(), c.req.query("scope") ?? "all");
  return r ? c.json(r) : c.json({ error: "not found" }, 404);
});
app.get("/api/notions", (c) => c.json(queries.notions(fresh())));
app.get("/api/notions/:id", (c) => {
  const r = queries.notion(fresh(), c.req.param("id"));
  return r ? c.json(r) : c.json({ error: "not found" }, 404);
});
app.get("/api/depute/:id/notions", (c) => c.json(queries.deputeNotions(fresh(), c.req.param("id"))));
app.get("/api/scrutin/:id", (c) => {
  const r = queries.hemicycle(fresh(), c.req.param("id"));
  return r ? c.json(r) : c.json({ error: "not found" }, 404);
});

export default { port: +(process.env.PORT ?? 3001), fetch: app.fetch };
