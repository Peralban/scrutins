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

Services: `deploy/install.sh` installs systemd user units: the API (`scrutins-api`, port 3001) and the front (`scrutins-web`, port 3000, serves the last `bun run build`) start at boot, and a timer refreshes the data daily at 06:30. The API picks up the new database without restarting; to ship front changes, rebuild then `systemctl --user restart scrutins-web`.

Glossary reports: the « Signaler » panel on `/glossaire` posts to `POST /api/signalement`, and the API opens an issue labelled `signalement` on [glossaire-politique](https://github.com/Peralban/glossaire-politique), so readers need no GitHub account. It needs a fine-grained GitHub token limited to that repository with **Issues: read and write**, in `~/.config/scrutins/env` (`chmod 600`):

```
GITHUB_TOKEN=github_pat_…
```

then `systemctl --user restart scrutins-api`. Without it the panel answers that reporting is not configured. Reports are capped at 5 per address and 40 in total per hour; a hidden field catches bots.

The glossary (`/glossaire`, selected-word definitions, "qu'est-ce que…" questions) comes from the shared [glossaire-politique](https://github.com/Peralban/glossaire-politique) package, pinned by tag in `package.json` and `web/package.json`; `web/content/glossaire-site.json` holds this site's own notes.

Themes are keyword rules on the title of the legislative text (`src/themes.ts`), a reading aid rather than an official taxonomy. Edit the rules, then `bun run ingest`.

Source: data.assemblee-nationale.fr, open licence.

## Notions (draft, labels not yet validated)

`notions/*.json` holds, for each notion, the amendments that were read one by one and given a direction: `+1` favours the notion, `-1` goes against it, `0` set aside. Each label carries a one-line justification and a confidence level; the file's `statut` says whether a human has reviewed it.

23 notions are published: nuclear power, ecology and climate, immigration, pensions, wealth and capital taxation, business taxation and charges, social benefits, public health, assisted dying, employees' rights, law-enforcement powers, penal severity, social housing, public education, defence effort, digital regulation, culture and sport funding, overseas territories, women's rights and anti-discrimination, farm incomes, public spending, and the censure of the government (the latter is direct data: the 23 motions of censure, no labelling).

Four more were defined but not published for lack of usable amendments: parliamentary democracy (4 retained), free trade (4), abortion/ART (1), rail transport (the keywords only found security amendments). They stay in `src/notions.ts`.

- The amendment text comes from the open-data "Tous les amendements" set (327 MB, downloaded once into `data/raw/amendements/`, not part of the nightly refresh). Amendments are linked to the scrutin that voted on them from the number and author in the scrutin title: 80 % of the amendment scrutins are linked, the rest (mostly the two finance bills, where half of the amendments have no recorded outcome) are left unclassified.
- Candidates of a notion: `bun scripts/candidates.ts <notion> --limit 80 --json out.json` (keywords in `src/notions.ts`, divisive votes only, the 80 most on-topic by keyword count). The labels of 22 of the 23 notions come from that sample, not from every amendment on the subject.
- A "pour" vote follows the amendment's direction and "contre" opposes it. That is not always a stance on the notion itself (an amendment can also fix a figure or a procedure): the pages say so.
- Only the labels are versioned. Adding a notion = a definition in `src/notions.ts`, a candidate list, a label file in `notions/`, then `bun run ingest`.
