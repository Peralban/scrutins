# scrutins

Cold, factual statistics on National Assembly votes (17th legislature). No editorial layer: numbers, definitions, sources.

- Source of truth: the open-data zips (`Scrutins`, `AMO10`, `AMO50` from data.assemblee-nationale.fr). `data/` is disposable.
- `bun run refresh` re-downloads everything and rebuilds `data/scrutins.db` from scratch, then swaps it in atomically. No incremental sync, no data migrations.
- Heavy aggregates are materialized at ingest (`MATERIALIZED` in `src/stats.ts`); the API only reads tables.
- Known source defects handled in `src/ingest.ts`: broken group ref `PO0` (resolved from each entry's members), renamed group `PO847173` -> `UDR`.
- Code, comments and commits in English; UI strings in French.
- Seats: `siege` records who sat at which place and when (non-delegated votes only); `hemicycle()` in `src/stats.ts` rebuilds a scrutin's seating from it. Vacant seats are not drawn; a departed deputy stays on their seat for 45 days.
- Themes: `src/themes.ts` (keyword rules on the legislative text title). Report the unclassified share wherever themes are shown.
