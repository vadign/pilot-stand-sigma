---
name: sigma-bugfix
description: Use when working on failing tests, runtime regressions, parser drift, sync failures, state bugs, or other unexpected behavior in this repository.
---

# Sigma Bugfix

Use this for real bug work in Sigma.

- Start with root-cause investigation. Reproduce, inspect the failing path, and identify where the bad state originates.
- If the bug is visible, route-driven, or interaction-driven, add `playwright`.
- If the bug depends on current library behavior, add `context7`.
- Common hotspots:
  `src/live/*`, `scripts/sync-*.mts`, `src/store/*`, `src/features/presentation/*`, `src/features/public-transport/*`
- Prefer targeted tests first, then broader verification.
- Default verification: `npm test` and `npm run build`
- Add `npm run lint` when touching shared React, routing, config, or TypeScript structure.
- For external-source issues, separate real application regressions from sandbox or network restrictions.
