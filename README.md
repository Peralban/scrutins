# scrutins

Votes of the French National Assembly (17th legislature), turned into plain statistics: group dissidence, participation, votes per month, per-deputy figures.

```
bun install
bun run refresh        # download the open data (~50 MB) and build data/scrutins.db
bun run start          # data API on http://localhost:3001

cd web && bun install
bun run dev            # Next.js on http://localhost:3000 (proxies /api to the data API)
bun run build && bun run start   # production
```

Two processes: `src/` is the data layer (Bun, SQLite, JSON API on :3001) and `web/` is the Next.js front (:3000). Set `API_URL` for the front if the API lives elsewhere.

Pages: `/accords.html` (who votes with whom: group matrix, nearest and furthest deputies, two-deputy comparison), `/` (group and deputy statistics), `/depute.html?id=PA…` (one deputy: groups, presence, dissent, theme profile), `/hemicycle.html` (one dot per seat, coloured by position on a chosen scrutin), `/themes.html` (vote profile of each group by theme).

Daily refresh: `deploy/install-timer.sh` installs a systemd user timer (06:30). The server picks up the new database without restarting.

Themes are keyword rules on the title of the legislative text (`src/themes.ts`), a reading aid rather than an official taxonomy. Edit the rules, then `bun run ingest`.

Source: data.assemblee-nationale.fr, open licence.
