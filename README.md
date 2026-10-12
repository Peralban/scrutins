# scrutins

Votes of the French National Assembly (17th legislature), turned into plain statistics: group dissidence, participation, votes per month, per-deputy figures.

```
bun install
bun run refresh   # download the open data (~46 MB) and build data/scrutins.db
bun run start     # http://localhost:3000
```

Run `bun run refresh` nightly (cron or a systemd timer); the server picks up the new database without restarting.

Source: data.assemblee-nationale.fr, open licence.
