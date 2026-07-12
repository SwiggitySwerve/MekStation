# Maintain Remaining Debt Pass — 2026-07-11

Follow-up to [verify pass](./2026-07-11-maintain-verify-pass.md) after lanes A/B/C merged.

## Goal

Clear the last maintain high and cut oxlint noise so the repo is not drowning in unused-import warnings.

## Results

| Check                                                       |                            Before |                           After |
| ----------------------------------------------------------- | --------------------------------: | ------------------------------: |
| Maintain critical/high (gate / product / scripts)           | 0 / 0 / 0 (+ 1 high in full repo) | **0 / 0 / 0** (full repo clean) |
| Full-repo high                                              |         `server.js` complexity 21 |                           **0** |
| Maintain warn (uxWalkthrough / gameplay barrel / near-dupe) |                      3 actionable |                           **0** |
| Oxlint warnings                                             |                          **1935** |                          **71** |
| Oxlint `no-unused-vars`                                     |                          **1830** |                           **0** |

### Remaining oxlint (non-blocking)

| Rule                          | Count | Notes                                |
| ----------------------------- | ----: | ------------------------------------ |
| `max-lines`                   |    30 | Soft file-size advisories (parked)   |
| `react-hooks/exhaustive-deps` |    41 | Pre-existing hook dep noise (parked) |

Cleared in follow-up commit: `explicit-module-boundary-types` (30→0) and intentional `routeHelpers` `no-console` suppressions.

## Changes

1. **Scanner** — skip `.tmp` ephemeral dirs.
2. **`server.js`** — extract upgrade helpers (`delegateOrDestroyNonMpUpgrade`, `configureMpUpgradeSocket`, `rejectUpgrade`, `attachVerifiedMpUpgrade`) so complexity drops below high.
3. **Warn cleanup**
   - `WalkthroughRecorder` → `createWalkthroughRecorder` factory
   - gameplay barrel ≤20 export lines via `CombatStateTypes.ts`
   - timeline `generatePayloadSummary` extracted to shared helper
4. **Oxlint** — remove dead imports/vars across `src/` (especially `src/simulation/runner` SOURCE_REFS scaffolding). Reverted unsafe `--fix-dangerously` hook-dep / `console.error` rewrites.

## Verification

- `npm run maintain:scan:gate` — 0 regressions
- `npm run maintain:scan -- --scope=product|scripts` — 0 critical/high
- `npx tsc --noEmit -p tsconfig.json` — clean
- `npx oxlint` — 114 warnings, 0 errors

## Out of scope

- Parked `validate-bv*` mega-function complexity (Lane C follow-up)
- Broad `max-lines` / `exhaustive-deps` / return-type refactors
