# Codex Workflow for `pilot-stand-sigma`

This file defines the fastest safe workflow for working in this repository with Codex.

## Repo Profile

- Stack: `React` + `Vite` + `TypeScript`
- Runtime shape: frontend-first app with local sync scripts, presentation/session flow, `SSE`, and lightweight `/api/*` endpoints
- Deploy shape: `Docker` + `docker compose`, not static hosting
- Risk profile: UI regressions, route regressions, parser/source drift, sync/runtime differences, SSE/session issues

## Default Workflow

Use this path unless the task is truly trivial:

1. Classify the task: `bug`, `small change`, `feature`, `PR feedback`, `deploy-sensitive`
2. Choose the minimum useful process skill
3. Use the minimum useful MCP/tooling
4. Implement the smallest correct change
5. Run fresh verification before claiming success
6. Request review before merge or after major changes

## Golden Rules

- For bugs, root cause first. Do not patch symptoms blindly.
- For library or API usage, prefer `context7` over memory.
- For UI or route changes, prefer `playwright` over guessing.
- Do not claim "fixed" without fresh command output.
- Prefer targeted changes over opportunistic refactors.
- If the change spans multiple subsystems, write a plan first.
- If the task affects routes, data loading, or presentation flow, run at least one smoke check beyond static reading.
- `stripe`, `supabase`, and `vercel` MCP are installed globally but are not part of this repo's default workflow.

## Task Playbooks

### 1. Bug / failing test / unexpected behavior

Use:
- `systematic-debugging`
- `playwright` if the bug is visual, route-related, or interaction-driven
- `context7` if the issue involves current library behavior
- `test-driven-development` after the root cause is understood

Default verification:
- targeted test first
- `npm test`
- `npm run build`

Add `npm run lint` when:
- touching shared UI, config, routing, TypeScript types, or broad refactors

### 2. Small UI change / copy / layout tweak

Use:
- `playwright` if the change affects interaction, layout, navigation, or responsive behavior
- `react-best-practices` when changing non-trivial React component behavior
- `web-design-guidelines` for UI review or a11y-oriented work

Default verification:
- `npm run build`

Add:
- `npm test` if the route/component already has relevant tests
- Playwright smoke if the change is visible or interactive

### 3. Feature / medium refactor

Use:
- `brainstorming`
- `writing-plans`
- `executing-plans`

Escalate to:
- `subagent-driven-development` or `dispatching-parallel-agents` only when work can be split cleanly

Default verification:
- `npm test`
- `npm run build`
- `npm run lint`

### 4. PR feedback / review comments

Use:
- `receiving-code-review`
- `gh-address-comments`

Optional:
- `github` MCP if auth is fully configured

Default verification:
- run only the commands needed to prove each addressed comment is resolved
- then run the broader relevant suite for changed areas

### 5. Deploy-sensitive change

Examples:
- `scripts/start.mts`
- `vite.config.ts`
- `compose.yml`
- `DEPLOY.md`
- `/session/*` or `/api/*` behavior

Use:
- `security-threat-model` when the change affects external inputs, network surfaces, env vars, or trust boundaries
- `playwright` for end-to-end session and route smoke checks

Default verification:
- `npm test`
- `npm run build`
- `docker compose config` if `compose.yml` changed

## Verification Gates

Use the smallest set that honestly proves the claim.

### Logic, parser, selector, store, sync changes

Run:

```bash
npm test
npm run build
```

### UI route, navigation, interaction, presentation flow

Run:

```bash
npm run build
```

Then add a Playwright smoke on the affected route or flow.

### Broad React or TypeScript refactor

Run:

```bash
npm run lint
npm test
npm run build
```

### Compose / deploy config change

Run:

```bash
docker compose config
npm run build
```

### External source / live-data behavior

Prefer:
- fixture-backed tests
- parser tests
- source manager tests

Note:
- runtime network checks may fail in sandboxed or restricted environments, so do not confuse network limits with application regressions

## Installed MCP

### Default

- `playwright`
  Best for route smoke tests, UI behavior, screenshots, navigation checks, and `/display` or `/mobile` flows.

- `context7`
  Best for up-to-date docs on `React`, `Vite`, `React Router`, `Tailwind`, and other libraries used here.

### Situational

- `openaiDeveloperDocs`
  Use only when the task actually touches OpenAI integration or docs.

- `github`
  Configured, but not yet a default part of the workflow. If access/auth errors appear, finish GitHub auth before relying on it.

### Installed But Not Default For This Repo

- `stripe`
- `supabase`
- `vercel`

These may be globally available in Codex, but this repository does not currently need them.

## Installed Skills

### Use By Default

- `systematic-debugging`
- `verification-before-completion`
- `writing-plans`
- `requesting-code-review`

### Use Often

- `brainstorming`
- `receiving-code-review`
- `test-driven-development`
- `playwright`
- `security-threat-model`

### Use When The Task Clearly Calls For It

- `executing-plans`
- `subagent-driven-development`
- `dispatching-parallel-agents`
- `using-git-worktrees`
- `gh-address-comments`
- `react-best-practices`
- `web-design-guidelines`
- `gh-fix-ci`

### Rarely Needed Here

- `finishing-a-development-branch`
- `slides`
- `writing-skills`
- `using-superpowers`

## Recommended Default Stack

If you do not want to think about process selection every time, use this as the default:

- Bugfix: `systematic-debugging` + `verification-before-completion`
- Regular feature: `brainstorming` + `writing-plans` + `verification-before-completion`
- Before merge: `requesting-code-review`
- UI work: add `playwright`
- Library/API uncertainty: add `context7`
- External surface or deploy-sensitive work: add `security-threat-model`

## Fast Prompt Templates

Use prompts like these with Codex:

```text
Fix this bug. Use systematic debugging, find root cause first, then verify with npm test and npm run build.
```

```text
Implement this feature. Start with a short plan, then execute it. Verify with lint, tests, and build.
```

```text
Review this UI change with Playwright and call out regressions on desktop and mobile.
```

```text
Check the current React/Vite API before changing this code. Use context7, then implement the fix.
```

```text
Address these PR comments one by one, verify each fix, then summarize what changed.
```

```text
Audit this change as deploy-sensitive. Check session flow, /api endpoints, env assumptions, and verification commands.
```

## Repo-Specific Notes

- This repo is not static-site-only. Do not treat it like a pure Vercel-style frontend.
- Production behavior includes `sync`, `/api/*`, and presentation/session flow, so route-level UI checks alone are not enough for sensitive changes.
- For source ingestion issues, separate real network failures from parser or application regressions.
- For presentation mode or transport flows, prefer behavior checks over source inspection alone.
