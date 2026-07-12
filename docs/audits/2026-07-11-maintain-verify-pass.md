# Maintenance Verify Pass — full repo — 2026-07-11 (post A+B+C)

Verification sweep on `main` after:

- #1056 Lane A+B merged
- #1057 Lane C merged

Open Brain was not used.

## Commands

```bash
npm run maintain:scan:gate
node scripts/maintenance/scan-maintenance.mjs --scope=scripts --json
node scripts/maintenance/scan-maintenance.mjs --json   # full repo
npm run lint -- --quiet
```

## Summary

| Lane                                                                  | Critical/High | Gate                  |
| --------------------------------------------------------------------- | ------------- | --------------------- |
| A — `src/` gate                                                       | **0**         | pass (0 regressions)  |
| B — product surface (`src`+`e2e`+electron+storybook+openspec scripts) | **0**         | —                     |
| C — `scripts/`                                                        | **0**         | —                     |
| Full repo (post `.tmp` skip)                                          | **1** high    | root `server.js` only |

| Category (full repo) | Critical | High | Medium | Warn                        | Info |
| -------------------- | -------- | ---- | ------ | --------------------------- | ---- |
| Complexity           | 0        | 1    | -      | -                           | -    |
| Type safety          | 0        | 0    | -      | -                           | -    |
| Dead code            | 0        | 0    | -      | -                           | -    |
| Code smells          | 0        | 0    | -      | -                           | -    |
| Design violations    | 0        | 0    | -      | 1                           | -    |
| Import health        | 0        | 0    | -      | 2\*                         | -    |
| File bloat           | 0        | 0    | -      | 2\*                         | ~700 |
| Near-duplicate       | 0        | 0    | -      | 6\*                         | ~800 |
| Stale TODOs          | 0        | 0    | -      | -                           | 4    |
| Lint                 | 0 errors | -    | -      | 1935 unused-import warnings | -    |

\* Some warn-tier near-duplicate / file-bloat / import-health pairs still mirror under paths that are gitignored or dual-counted; actionable product warns are listed below.

## Critical & High (Action Required)

1. **`server.js:503`** — HIGH · complexity · anonymous handler complexity 21 · Custom Next+WebSocket server at repo root. Barely over the high threshold (21). Optional: extract route/upgrade handlers. **Not blocking product gates.**

## Medium / Warn (Track)

| Item                               | Notes                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `e2e/helpers/uxWalkthrough.ts:147` | value-object class 14 public methods (warn)                             |
| `src/types/gameplay/index.ts:1`    | barrel re-exports 21 symbols (warn)                                     |
| oxlint 1935 warnings               | 94.6% unused imports in `src/simulation/runner` — separate hygiene wave |

## Hygiene applied this verify pass

- Scanner now skips `.tmp` directories (so gitignored `desktop/.tmp/**` standalone copies no longer pollute full-repo CH).

## Structural Referral

Not triggered (no critical file-bloat / god-class / 4+ duplicate clusters).

## Verdict

**A+B+C hold.** Product and scripts lanes are clean at critical/high. Remaining actionable CH is the root `server.js` complexity-21 edge case; remaining debt is warn/info + the known oxlint unused-import pile.

### Fix options

- `server` — extract handlers in root `server.js` to clear the last high
- `warns` — uxWalkthrough / gameplay barrel
- `unused-imports` — oxlint runner sweep
- `skip` — accept verify pass; no further work
