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

## Notions (draft, labels not yet validated)

`notions/*.json` holds, for each notion (nuclear, ecology and climate, immigration, pensions), the amendments that were read one by one and given a direction: `+1` favours the notion, `-1` goes against it, `0` set aside. Each label carries a one-line justification and a confidence level; the file's `statut` says whether a human has reviewed it.

- The amendment text comes from the open-data "Tous les amendements" set (327 MB, downloaded once into `data/raw/amendements/`, not part of the nightly refresh). Amendments are linked to the scrutin that voted on them from the number and author in the scrutin title: 80 % of the amendment scrutins are linked, the rest (mostly the two finance bills, where half of the amendments have no recorded outcome) are left unclassified.
- `bun scripts/candidates.ts <notion> --json out.json` lists the candidates of a notion (keywords in `src/notions.ts`, divisive votes only).
- A "pour" vote follows the amendment's direction and "contre" opposes it. That is not always a stance on the notion itself (an amendment can also fix a figure or a procedure): the pages say so.
