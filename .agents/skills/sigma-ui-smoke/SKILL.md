---
name: sigma-ui-smoke
description: Use when changing routes, visible UI, responsive behavior, map interactions, or presentation flows such as /display and /mobile in this repository.
---

# Sigma UI Smoke

Use browser verification instead of code inspection alone.

- Prefer `playwright` for affected routes and interaction flows.
- Check the changed route plus one adjacent critical path when practical.
- Watch for console errors, broken requests, navigation failures, and layout regressions.
- Check desktop and mobile when the layout or interaction is responsive.
- Priority routes:
  `/mayor-dashboard`, `/operations`, `/history`, `/public-transport`, `/display`, `/mobile`
- Default verification: `npm run build` plus a Playwright smoke check
- Add targeted tests only if the area already has useful existing coverage.
- For presentation changes, validate session creation or stream behavior, not just static rendering.
