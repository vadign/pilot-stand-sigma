# AGENTS.md

Policy layer for Codex in `pilot-stand-sigma`.

Detailed operating guide: [CODEX_WORKFLOW.md](/Users/vadign/pilot-stand-sigma/CODEX_WORKFLOW.md)

## Always

- Prefer the smallest correct change.
- For bugs or unexpected behavior, investigate root cause before fixing symptoms.
- If work spans multiple subsystems, write a short plan before editing code.
- Before claiming success, run fresh verification commands that directly prove the claim.
- Do not treat this repo as a static-only frontend. Production behavior includes sync scripts, `/api/*`, and presentation/session flow.

## Tool Selection

- Use `playwright` for route changes, visible UI, responsive behavior, map interaction, `/display`, `/mobile`, and other browser-driven flows.
- Use `context7` for current library and API behavior instead of relying on memory.
- Use `github` MCP only when it is authenticated and the task truly needs GitHub context.
- Ignore `stripe`, `supabase`, and `vercel` MCP by default for this repository.

## Task Routing

Use repo-local skills when the trigger matches:

- `sigma-bugfix`
- `sigma-ui-smoke`
- `sigma-live-sources`
- `sigma-deploy-sensitive`

Use superpowers process skills as defaults:

- `systematic-debugging` for bugs
- `verification-before-completion` before any completion claim
- `writing-plans` for multi-step work
- `requesting-code-review` before merge or after major changes

## Verification Defaults

- Logic, parser, selector, store, sync changes: `npm test` and `npm run build`
- Broad React or TypeScript refactor: `npm run lint`, `npm test`, and `npm run build`
- UI or route changes: `npm run build` plus a Playwright smoke check
- Compose or deploy changes: `docker compose config` and `npm run build`

## Repo Hotspots

- Live sources and fallbacks: `src/live/*`, `scripts/sync-*.mts`, `docs/live-sources.md`
- Presentation and SSE flow: `src/features/presentation/*`, `src/features/presentation/server/*`
- Runtime server behavior: `scripts/start.mts`, `vite.config.ts`
- Transport server surfaces: `src/features/public-transport/server/*`
- Deploy config: `compose.yml`, `deploy/*`, `DEPLOY.md`

Read [CODEX_WORKFLOW.md](/Users/vadign/pilot-stand-sigma/CODEX_WORKFLOW.md) when you need the fuller playbook, MCP inventory, or prompt templates.
