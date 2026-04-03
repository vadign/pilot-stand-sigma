---
name: sigma-live-sources
description: Use when touching 051 or OpenData ingestion, parsers, providers, snapshots, cache priority, freshness, or fallback behavior in this repository.
---

# Sigma Live Sources

Use this when working on live-data behavior.

- Preserve source priority:
  `runtime fetch -> snapshot asset -> IndexedDB cache -> mock fallback`
- Key areas:
  `docs/live-sources.md`, `scripts/sync-051.mts`, `scripts/sync-live.mts`, `scripts/build_education_snapshot.py`, `src/live/*`, `public/live-data/*`, `src/features/public-transport/providers/*`
- Prefer fixture-backed tests, parser tests, and source-manager tests over live network probing.
- Do not conclude the app is broken until you separate parser logic from network, CORS, or sandbox restrictions.
- Be explicit about freshness, TTL, and fallback behavior.
- Default verification: `npm test` and `npm run build`
