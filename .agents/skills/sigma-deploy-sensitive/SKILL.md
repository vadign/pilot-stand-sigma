---
name: sigma-deploy-sensitive
description: Use when changing startup, preview/runtime server behavior, Docker or Compose config, env handling, /api endpoints, SSE, or deployment-sensitive code in this repository.
---

# Sigma Deploy Sensitive

Treat these changes as runtime-system work, not just frontend edits.

- Consider these files and surfaces together:
  `scripts/start.mts`, `vite.config.ts`, `compose.yml`, `deploy/*`, `src/live/server/*`, `src/features/presentation/server/*`, `src/features/public-transport/server/*`
- Preserve the production model:
  build output + preview/runtime server + sync behavior + long-lived session and stream endpoints
- For external surfaces, env handling, proxies, or trust boundaries, add `security-threat-model`.
- For `/display`, `/mobile`, `/session/*`, or `/api/*` changes, prefer behavior checks over static inspection alone.
- Default verification: `npm run build`
- If `compose.yml` changed, also run: `docker compose config`
- Add Playwright smoke checks for affected runtime flows when feasible.
