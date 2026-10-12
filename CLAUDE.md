# scrutins

Cold, factual statistics on National Assembly votes (17th legislature). No editorial layer: numbers, definitions, sources.

- Source of truth: the open-data zips (`Scrutins`, `AMO10`, `AMO50` from data.assemblee-nationale.fr). `data/` is disposable.
- `bun run refresh` re-downloads everything and rebuilds `data/scrutins.db` from scratch, then swaps it in atomically. No incremental sync, no data migrations.
- Heavy aggregates are materialized at ingest (`MATERIALIZED` in `src/stats.ts`); the API only reads tables.
- Known source defects handled in `src/ingest.ts`: broken group ref `PO0` (resolved from each entry's members), renamed group `PO847173` -> `UDR`.
- Code, comments and commits in English; UI strings in French.
