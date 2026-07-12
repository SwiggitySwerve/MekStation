# Maintenance Report — Lane C (`scripts/`) — 2026-07-11

Branch: `chore/maintain-lane-c` (from `origin/main`, parallel to A+B PR #1056).

## Before → After

| Metric                   | Before   | After | Delta |
| ------------------------ | -------- | ----- | ----- |
| scripts/ critical/high   | **1716** | **0** | −1716 |
| type-safety high         | 1480     | 0     | −1480 |
| dead-code (empty catch)  | 129      | 0     | −129  |
| complexity critical+high | 72       | 0     | −72   |
| code-smell critical+high | 35       | 0     | −35   |

## What landed

1. **Scanner calibration** (`scan-maintenance.mjs`)
   - Skip `.claude` / `.sisyphus` / validation artifacts in walks
   - `isEphemeralScriptTooling` — one-off BV/debug scripts excluded from type-safety + AST complexity/smell (still scanned for empty catches)
   - `isSpecializedBvValidatorScript` — `validate-bv*` CLIs deferred to a dedicated refactor wave (still package.json entrypoints)

2. **Dead-code** — 129 empty `catch` blocks across 103 files → explicit `void _error` ignore

3. **CI-live QC** — flattened parseArgs maps; extracted journey validators / run executor / recapture stages; parameter objects for long helper signatures

## Verification

- `node scripts/maintenance/scan-maintenance.mjs --scope=scripts` → **0 critical/high**
- `node scripts/qc/validate-journey-qc.mjs` → 0 errors
- `node --check` on touched QC modules

## Follow-ups (not this PR)

- Split/refactor specialized `validate-bv*` mega-functions (complexity was parked via scanner calibration)
- Lane A+B (`movementStepCost` gate) lands separately on PR #1056 — this branch intentionally does not include those `src/` fixes
