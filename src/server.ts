import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { statSync } from "node:fs";
import { DB_PATH, open, queries } from "./stats";

// The nightly ingest swaps the file atomically; reopen when it changes.
let db = open(), mtime = statSync(DB_PATH).mtimeMs;
const fresh = () => {
  const m = statSync(DB_PATH).mtimeMs;
  if (m !== mtime) { db.close(); db = open(); mtime = m; }
  return db;
};
const app = new Hono();

app.get("/api/overview", (c) => c.json(queries.overview(fresh())));
app.get("/api/groupes", (c) => c.json(queries.groupes(fresh())));
app.get("/api/mensuel", (c) => c.json(queries.mensuel(fresh())));
app.get("/api/deputes", (c) =>
  c.json(queries.deputes(fresh(), Math.min(+(c.req.query("limit") ?? 577), 577), +(c.req.query("min") ?? 50))));
app.get("/api/scrutins", (c) =>
  c.json(queries.scrutins(fresh(), c.req.query("q") ?? "", Math.min(+(c.req.query("limit") ?? 100), 500))));

app.use("/*", serveStatic({ root: "./web" }));

export default { port: +(process.env.PORT ?? 3000), fetch: app.fetch };
