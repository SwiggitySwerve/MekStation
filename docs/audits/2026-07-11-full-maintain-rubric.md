# Maintenance Report — full repo — 2026-07-11

Full 11-scanner maintain sweep via `scripts/maintenance/scan-maintenance.mjs`
(plus Scanner 6 oxlint). Open Brain was not used.

**Command:** `node scripts/maintenance/scan-maintenance.mjs --json --limit=500`  
**Artifacts:** `docs/audits/_scratch/maintain-full-2026-07-11.json`,
`maintain-src-gate-2026-07-11.json`, `maintain-actionable-2026-07-11.json`,
`maintain-critical-high.json`  
**Scanner hygiene applied this run:** skip `.claude`, `.sisyphus`,
`validation-output`, `simulation-reports` (stale worktrees / evidence HTML
were poisoning the walk).

## Excluded (Not Scanned / Noise)

| Path / class                                                   | Reason                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `node_modules/`, `.next/`, `coverage/`, `dist/`, build outputs | Standard skipDirs                                       |
| `.claude/worktrees/**`                                         | Broken / stale worktree links — now skipped             |
| `.sisyphus/evidence/**` HTML                                   | Generated walkthrough evidence — now skipped            |
| `desktop/.tmp/**`                                              | Packaged Next standalone copy — treat as build artifact |
| Generated / seed / fixture / `*.d.ts` / test-helpers           | Scanner bloat exclusions                                |
| Test files for type-safety lane                                | Per maintain Scanner 2 policy                           |

## Rubric — how to read this report

Raw full-repo totals are **dominated by `scripts/` one-off BV/debug tooling**
(~95% of critical/high). Treat three lanes separately:

| Lane                               | Scope                                                                    | Use for                                              |
| ---------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| **A — Production gate**            | `src/` only (`maintain:scan:gate`)                                       | CI regression vs `docs/qc/maintenance-baseline.json` |
| **B — Actionable product surface** | `src/` + `e2e/` + `desktop/electron` + `.storybook` + `openspec/scripts` | Fix waves that affect the app / tests                |
| **C — Tooling archive**            | `scripts/` analysis/debug/BV validators                                  | Optional; do not block product PRs                   |

## Summary — Lane A (`src/` gate)

| Category                                                     | Critical | High  | Medium | Low | Warn/Info        |
| ------------------------------------------------------------ | -------- | ----- | ------ | --- | ---------------- |
| code-smell                                                   | 0        | **2** | -      | -   | -                |
| import-health                                                | -        | -     | -      | -   | warn 1           |
| near-duplicate                                               | -        | -     | -      | -   | warn 1 / info 65 |
| file-bloat                                                   | -        | -     | -      | -   | info 333         |
| type-safety / dead-code / complexity / test-gap / stale-todo | 0        | 0     | -      | -   | -                |
| **Gate total critical/high**                                 |          | **2** |        |     |                  |

**Baseline regression:** reviewed baseline `criticalHigh=0` → current **2**
(+2 `code-smell` on `movementStepCost.ts`). `npm run maintain:scan:gate`
would fail until these are fixed or the baseline is deliberately raised.

## Summary — Lane B (actionable product surface)

| Category          | Critical | High   | Medium | Warn                        |
| ----------------- | -------- | ------ | ------ | --------------------------- |
| File bloat        | 1        | 0      | -      | 0                           |
| Type safety       | 0        | 17     | -      | -                           |
| Dead code         | 0        | 1      | -      | -                           |
| Import health     | 0        | 0      | -      | 1                           |
| Stale TODOs       | 0        | 0      | 2      | -                           |
| Complexity        | 0        | 1      | -      | -                           |
| Code smells       | 0        | 3      | -      | -                           |
| Design violations | 0        | 2      | -      | 1                           |
| Near-duplicate    | 0        | 0      | -      | 0 (info 4)                  |
| Test gaps         | 0        | 0      | -      | - (scanner naming mismatch) |
| **Total**         | **1**    | **24** | **2**  | **2**                       |

## Summary — Lane C (raw full repo, includes scripts)

| Category          | Critical | High     | Medium | Warn     | Info       |
| ----------------- | -------- | -------- | ------ | -------- | ---------- |
| File bloat        | 5        | 0        | -      | 15       | 699        |
| Type safety       | 0        | 1497     | -      | -        | -          |
| Dead code         | 0        | 130      | -      | -        | -          |
| Import health     | 0        | 0        | -      | 2        | -          |
| Stale TODOs       | 0        | 0        | 2      | -        | 4          |
| Lint (oxlint)     | 0 err    | -        | -      | **1935** | -          |
| Test gaps         | 0        | 0        | -      | -        | -          |
| Complexity        | 36       | 39       | -      | -        | -          |
| Code smells       | 22       | 16       | -      | -        | -          |
| Design violations | 0        | 2        | -      | 1        | -          |
| Duplication       | 0        | 0        | -      | 6        | 788        |
| **Total CH**      | **63**   | **1684** |        |          | **= 1747** |

Note: **1480/1497 type-safety highs** and **129/130 dead-code highs** live in
`scripts/`. Production `src/` has **0** type-safety critical/high.

## Scanner 6 — Lint & Build

| Gate                    | Result                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `npm run lint` (oxlint) | **0 errors**, 1935 warnings                                                                  |
| Warning concentration   | 94.6% `eslint(no-unused-vars)` — mostly unused imports in `src/simulation/runner`            |
| Other rules             | `exhaustive-deps` 41 · `max-lines` 31 · `explicit-module-boundary-types` 30 · `no-console` 3 |
| Scope                   | `.oxlintrc.json` ignores tests/e2e/scripts/desktop — all 1935 are under `src/`               |
| Auto-fix                | `oxlint --fix` does not clear these; unused-import cleanup needs gated `--fix-suggestions`   |

Top warning files: `HexCell.rootAttributes.ts` (115), then CombatFeatureSupport /
sourceRefs slices under `src/simulation/runner/`.

## Critical & High Findings — Lane B (Action Required)

1. **`e2e/layout-sweep/screenInventory.ts`** — CRITICAL · file-bloat · 1305 LOC · Split manifest / metadata / per-class route tables.
2. **`src/utils/gameplay/movement/movementStepCost.ts:65`** — HIGH · code-smell · nesting depth 5 · Extract terrain-feature handlers (**src gate regression**).
3. **`src/utils/gameplay/movement/movementStepCost.ts:205`** — HIGH · code-smell · 9 parameters · Introduce `IMovementElevationStepCostInput` (**src gate regression**).
4. **`desktop/electron/main.ts:419`** — HIGH · dead-code · commented-out auto-save block · Delete or implement behind a real flag.
5. **`e2e/flow-audits.spec.ts:130`** — HIGH · design-violation · `FlowRecorder` 7 public methods · Collapse / shared adapter.
6. **`e2e/ux-deep-play-audit.spec.ts:109`** — HIGH · design-violation · `JourneyDriver` 6 public methods · Split runner vs registry.
7. **`e2e/fixtures/customizer.ts`** (14×) — HIGH · type-safety · `as unknown as` on window templates · Add `e2e` `Window` augmentation.
8. **`e2e/helpers/scenarioPackLoading.ts:599`** — HIGH · type-safety · double cast · Typed validator / guard.
9. **`.storybook/mocks/useElectron.tsx:104,111`** — HIGH · type-safety · window casts · Extend `Window` with `electronAPI`.
10. **`openspec/scripts/spec-purpose-lint.ts:377`** / **`validate-terminology.js:240`** — HIGH · smell/complexity · Flatten CLI / terminology validators.

### Lane A only (must-fix for green `maintain:scan:gate`)

- Items **2–3** above (`movementStepCost.ts`).

### Lane C tooling samples (do not block product)

- `scripts/validate-bv-crit-scan.ts` `scanCrits` complexity **309** / nesting **21**
- `scripts/validate-bv-calculator.ts` `calculateUnitBV` complexity **182**
- `scripts/qc/journey-qc-core.mjs` `parseArgs` nesting **24**
- ~130 empty `catch` blocks across BV debug scripts
- ~1480 `any` / double-casts in scripts

## Medium / Warn (Address When Touching)

| Item                                                  | Note                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `e2e/audit-capture.spec.ts:331,346` stale-todo medium | Screenshot baseline ownership (from prior test-rot round)                                     |
| `src/types/gameplay/index.ts` import-health warn      | Barrel re-exports 21 symbols                                                                  |
| Near-duplicate warn clusters                          | Mostly mirrored under `desktop/.tmp` — ignore; real clusters live in audit/timeline UI        |
| file-bloat info ×333 under `src/`                     | Soft advisory under scanner thresholds (scanner critical=1200; FILE_MODULARITY_SPEC hard=500) |

## Threshold note

|               | FILE_MODULARITY_SPEC | Scanner `standard` |
| ------------- | -------------------- | ------------------ |
| Target / info | ~300                 | 300                |
| Soft / warn   | **400**              | **600**            |
| Hard / high   | **500**              | **900**            |
| Critical      | split at 500+        | **1200**           |

Many `src/` files that fail the project modularity soft-max still only count as
scanner **info**. Prefer FILE_MODULARITY_SPEC when scheduling splits.

## Structural Referral

This sweep flagged **5 critical file-bloat** findings in the raw full-repo
scan (4 evidence HTML + 1 e2e inventory) and **36 critical complexity**
findings in tooling. Product-lane critical file-bloat is **1**
(`screenInventory.ts`). No prior `ai-ready-codebase` artifact found in-repo.

Consider `/ai-ready-codebase` if you want a tree-shape pass (module breadth,
interface visibility, depth ratio) complementary to this debt sweep — especially
around `e2e/layout-sweep` and QC script sprawl. Do not auto-chain; optional.

## Prior adjacent work

- Test-rot surface batch earlier today:
  [`docs/audits/2026-07-11-test-rot-surface-maintain.md`](./2026-07-11-test-rot-surface-maintain.md)
- Reviewed warning ledger: `docs/qc/maintenance-warning-ledger.json`
- Src baseline: `docs/qc/maintenance-baseline.json` (Wave 12 → 0 CH; now
  regressed by +2)

---

## Remediation — Lane A + B (2026-07-11)

**Status: complete.** Lane C (`scripts/` tooling) deferred.

| Metric                          | Before (A/B) | After | Delta |
| ------------------------------- | ------------ | ----- | ----- |
| `src/` gate critical/high       | 2            | **0** | −2    |
| Baseline regressions            | 2            | **0** | −2    |
| Lane B actionable critical/high | 25           | **0** | −25   |
| Typecheck                       | —            | pass  | —     |

### Fixes landed

| Lane         | Change                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| A            | `movementStepCost.ts` — extracted terrain accumulator; elevation step cost takes input object |
| B bloat      | `screenInventory.ts` split into types/chrome/entry modules; facade 61 LOC                     |
| B types      | `e2e/types/window.d.ts`; customizer + scenarioPack + storybook casts removed                  |
| B design     | `FlowRecorder` / `JourneyDriver` → factory functions                                          |
| B dead-code  | Removed commented auto-save block in `desktop/electron/main.ts`                               |
| B openspec   | Flattened `parseArgs`; split terminology skip helpers                                         |
| B stale-todo | Rewrote audit-capture baseline comments                                                       |

### Remaining (not CH; optional follow-ups)

- warn: `e2e/helpers/uxWalkthrough.ts` value-object method count
- warn: `src/types/gameplay/index.ts` barrel breadth
- Lane C: `scripts/` complexity / `any` / empty catches
- oxlint unused-imports in `src/simulation/runner` (1935 warnings; separate hygiene wave)

### Next

Say `C` / `scripts` to start Lane C, or `unused-imports` for the oxlint sweep, or `commit` to land A+B.
