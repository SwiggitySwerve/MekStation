# Tasks: Restore BV Parity Reproducibility

## 1. Investigation and red-first evidence

- [x] 1.1 Reproduce D-1 from a clean state: before restoring the cache,
  `npm.cmd run validate:bv` found only the 389 hardcoded override references,
  printed all three accuracy gates as FAIL (`85.9%`, `95.4%`, `98.2%`), and
  still exited `0`. This is the real red baseline; the legacy overrides prevent
  the older "Calculated: 0" shape but preserve the same hollow-green failure.
- [x] 1.2 Confirm the index schema gap: live `index.json` entries have keys
  `id, chassis, model, tonnage, techBase, year, role, rulesLevel, path`; the
  harness declared required `cost` and `bv`, and reference resolution depended
  on `iu.bv` as the last fallback.
- [x] 1.3 Add a fail-loud regression probe:
  `scripts/__tests__/validate-bv-fail-loud.test.ts` runs the CLI against
  missing, below-floor, and gate-failing reference data and asserts non-zero
  exit codes.

## 2. Commit a reproducible reference dataset

- [x] 2.1 Source the full reference dataset:
  `scripts/data-migration/megamek-bv-cache.json` was restored from the local
  MekStation checkout's MegaMek extraction cache.
- [x] 2.2 Point the harness at the committed dataset by default in CI: default
  reference lookup remains `scripts/data-migration`, with `--reference-dir` /
  `MEKSTATION_BV_REFERENCE_DIR` available only for probes and fixtures.
- [x] 2.3 Record the committed coverage count: the full-cache floor is `4196`
  calculated BattleMechs.

## 3. Make the harness fail loud

- [x] 3.1 Add a missing/empty-reference guard in `main()`: missing or empty
  reference data exits `2` before unit processing.
- [x] 3.2 Add the below-floor-coverage guard: calculated coverage below the
  committed floor exits `3` after reports are written.
- [x] 3.3 Make accuracy gates blocking: any failed within-1/2/3% gate exits `4`
  after reports are written.
- [x] 3.4 Use distinct non-zero exit codes: `2` missing reference, `3`
  below-floor coverage, `4` accuracy-gate failure.

## 4. Fix the index schema fidelity

- [x] 4.1 Correct `IndexUnit`: `cost` and `bv` are optional to match the actual
  index schema.
- [x] 4.2 Update reference-BV resolution: committed MegaMek/MUL data are the
  authoritative references; absent index BV routes to the counted
  "No reference BV available" tally instead of silently satisfying the gate.

## 5. Wire the gate into the blocking lane

- [x] 5.1 Confirm wiring: `package.json` runs `npx tsx scripts/validate-bv.ts`
  for `validate:bv`, and `.github/workflows/pr-checks.yml` runs
  `npm run validate:bv` in the `Validate BV Parity` job, so the new non-zero
  exits fail CI.
- [x] 5.2 Reconcile the documented parity figure: the branch-owned audit row now
  records the reproduced run (`Calculated: 4196`, `Within 1%: 4188 (99.8%)`,
  `Within 3%: 4196 (100.0%)`, coverage floor `4196/4196`). No repo-local
  `MEMORY.md` exists in this worktree, so the auditable branch artifact is
  `docs/audits/2026-06-12-full-codebase-review.md`.

## 6. Verification

- [x] 6.1 Run `npm run validate:bv` with the committed dataset present:
  calculated `4196`, gates PASS, coverage floor `4196/4196`, exit `0`.
- [x] 6.2 Run negative cases: the focused Jest probe confirms missing reference
  exits `2`, below-floor coverage exits `3`, and gate failure exits `4`.
- [x] 6.3 Full verification: `npx.cmd tsc --noEmit --skipLibCheck` passed;
  `npm.cmd run lint` passed with 62 warnings / 0 errors; focused Jest probe
  passed; `npx.cmd openspec validate restore-bv-parity-reproducibility --strict`
  passed; `npx.cmd openspec validate --all --strict` passed with 216 items; `git
  diff --check` passed.
