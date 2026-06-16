# Change: Restore BV Parity Reproducibility

## Why

The documented "99.8% within 1% / 4187-of-4196" BV parity headline (`MEMORY.md`,
`bv-validation-tooling` spec) can no longer be reproduced, and the harness that
is supposed to enforce it now passes silently at zero coverage. This is the
measurement-integrity finding **D-1 (high)** in the 2026-06-12 full codebase
review: the verification layer actively conceals BV drift instead of failing
loudly (audit §"Cluster D", §"Headline metrics no longer reproduce").

Verified in this session against the worktree:

- Both reference caches the harness reads are **absent** —
  `scripts/data-migration/megamek-bv-cache.json` and
  `scripts/data-migration/mul-bv-cache.json` do not exist on disk. The harness
  loads them only inside `if (fs.existsSync(...))` guards
  (`scripts/validate-bv.ts:4677` and `:4700`), so a missing cache leaves both
  reference maps empty with no warning.
- `index.json` **dropped its `bv` field** — the real unit entries carry keys
  `id, chassis, model, tonnage, techBase, year, role, rulesLevel, path` and no
  `bv` (nor `cost`), but the `IndexUnit` interface
  (`scripts/validate-bv.ts:29`) still declares `bv: number` and `cost: number`.
  The reference fallback `const referenceBV = megamekBV ?? mulBV ?? iu.bv`
  (`scripts/validate-bv.ts:5220`) therefore resolves to `undefined` for every
  unit when the caches are absent.
- The harness **exits green on zero coverage** — with no reference BV, the
  `if (!referenceBV || referenceBV === 0)` guard (`scripts/validate-bv.ts:5251`)
  excludes every unit as "No reference BV available", `calc` ends at 0, the
  within-1/2/3% percentages are all 0 (`scripts/validate-bv.ts:5323`), the
  accuracy gates print `❌ FAIL` (`scripts/validate-bv.ts:5337`), and `main()`
  then returns normally. The only non-zero exits are the fatal-catch
  (`scripts/validate-bv.ts:5449`) and the missing-index guard
  (`scripts/validate-bv.ts:4650`) — neither covers gate failure or zero
  coverage, so `npm run validate:bv` exits `0` while reporting FAIL. The audit
  records that a full run in this state validates only the 389 hardcoded
  `MUL_BV_OVERRIDES` entries (`scripts/validate-bv.ts:4736`) at 85.9% and still
  exits 0.

The combined effect is that the gate the team treats as the BV correctness
backstop (`bv-validation-tooling` requirement "BV Validation Report Is the
Source for Swarm Catalog Hydration" asserts a ">99.8% parity gate") cannot be
reproduced and would not block a regression even if every unit miscalculated.
This change makes the parity gate reproducible and fail-loud before any
BV-adjacent change ships on top of a hollow signal.

## What Changes

- Commit a reproducible reference dataset so parity can be recomputed in CI:
  either the full MegaMek BV reference cache(s) the harness already reads
  (`scripts/data-migration/megamek-bv-cache.json` / `mul-bv-cache.json`) OR a
  committed fixture subset (anchored by units named in the
  `bv-validation-tooling` spec, e.g. `atlas-as7-d`) with the harness pointed at
  the fixture by default in CI. The chosen artifact is checked into the repo so
  a clean clone reproduces the documented parity number.
- Make `scripts/validate-bv.ts` **fail loud**: exit non-zero when the reference
  dataset is missing/empty, when calculated coverage falls below a committed
  minimum-coverage threshold, and when any accuracy gate (`g1/g2/g3`) reports
  FAIL. Silent green at zero coverage is removed.
- Fix the `IndexUnit` interface (`scripts/validate-bv.ts:29`) to match the
  actual `index.json` schema (drop `bv`/`cost` or mark them optional), and make
  the reference-BV resolution treat "no reference available" as an explicit,
  counted, fail-loud condition rather than an `undefined` that silently excludes
  the unit.
- Pin the parity target as a behavioral guarantee of the BV engine so the
  reproduced "99.8% within 1% (4188/4196)" claim has an owning requirement that
  the tooling enforces, rather than living only in narrative.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `bv-validation-tooling`: the harness gains a committed-reference-dataset
  requirement, a fail-loud exit-code requirement (missing reference, below-floor
  coverage, and gate FAIL all exit non-zero), and an index-schema-fidelity
  requirement (the `IndexUnit` interface and reference-BV resolution match the
  real `index.json` schema and never silently exclude on a schema mismatch).
- `battle-value-system`: an explicit, reproducible BV-parity guarantee requirement
  pins the documented parity target as a contract the engine must hold and the
  tooling must be able to recompute from committed reference data.

## Impact

- `scripts/validate-bv.ts` — `IndexUnit` interface (`:29`), reference cache
  loading (`:4671`–`:4730`), reference-BV resolution (`:5217`–`:5258`), gate
  computation and final exit (`:5326`–`:5445`, new fail-loud exit codes).
- `scripts/data-migration/megamek-bv-cache.json` and/or
  `scripts/data-migration/mul-bv-cache.json` (or a committed fixture subset under
  `scripts/data-migration/` or `src/__tests__/fixtures/`) — restored/committed
  reference dataset.
- `package.json` `validate:bv` script and the CI BV-validate job — now treated
  as a real blocking gate because the harness exits non-zero on failure.
- `MEMORY.md` / `docs/audits/2026-06-12-full-codebase-review.md` D-1 row —
  reconciled once the parity number reproduces from a clean checkout.

## Non-goals

- No change to the BV calculation engine math — `battleValueCalculations.ts`,
  `equipmentBVResolver.ts`, and the per-unit formulas are untouched; this change
  restores the ability to *measure* parity, it does not re-tune any unit's BV.
- No non-mech BV data backfill — vehicle/aerospace/protomech/BA/infantry data
  absence is finding D-2 and a separate change; this change scopes the mech BV
  gate only.
- No CI-platform/workflow rewrite beyond wiring the now-fail-loud `validate:bv`
  into the blocking lane (broader CI-teeth restoration is
  `restore-ci-correctness-teeth`).
- No regeneration of `index.json` to re-add a `bv` field — the index dropping
  `bv` is treated as the current schema; the harness is corrected to source
  reference BV from the committed reference dataset, not from the index.
