# Tasks: Restore BV Parity Reproducibility

## 1. Investigation and red-first evidence

- [ ] 1.1 Reproduce D-1 from a clean state: run `npm run validate:bv` (or
  `npx tsx scripts/validate-bv.ts`) with the caches absent and capture that it
  prints the accuracy gates as `❌ FAIL` (`scripts/validate-bv.ts:5337`) while
  the process **exits 0** (`echo $LASTEXITCODE` / `$?`). Record the
  "Excluded: <N> No reference BV available" line and the "Calculated: 0" summary
  (`scripts/validate-bv.ts:5331`) as the red baseline.
- [ ] 1.2 Confirm the index schema gap: assert the real `index.json` units have
  no `bv` field while `IndexUnit` (`scripts/validate-bv.ts:29`) declares
  `bv: number`; document the `referenceBV = megamekBV ?? mulBV ?? iu.bv`
  resolution (`scripts/validate-bv.ts:5220`) collapsing to `undefined`.
- [ ] 1.3 Write a red-first harness assertion (a small spec or a CI smoke step)
  that runs `validate-bv.ts` against an empty/absent reference dataset and
  expects a **non-zero** exit — demonstrating the gate is hollow today
  (this test fails before task 3, passes after).

## 2. Commit a reproducible reference dataset

- [ ] 2.1 Source and commit the reference dataset per design D1: prefer the full
  `scripts/data-migration/megamek-bv-cache.json` (and/or `mul-bv-cache.json`)
  covering the represented mech catalog; if the full cache cannot be committed,
  author a committed fixture subset anchored by `atlas-as7-d` plus a tech-base
  spread (IS / Clan / Mixed) under `scripts/data-migration/` or
  `src/__tests__/fixtures/`.
- [ ] 2.2 Point the harness at the committed dataset by default in CI: ensure the
  cache path resolution (`scripts/validate-bv.ts:4673`–`:4699`) finds the
  committed artifact from a clean clone, or add an explicit `--reference`/env
  override that CI sets to the fixture path.
- [ ] 2.3 Record the committed coverage count (full-catalog or fixture unit
  count) — this becomes the minimum-coverage floor used in task 3.2.

## 3. Make the harness fail loud

- [ ] 3.1 Add a missing/empty-reference guard in `main()`
  (`scripts/validate-bv.ts`, after the cache loads at `:4730`): if neither cache
  nor the committed fixture yields any reference BV, print an explicit error and
  `process.exit(<non-zero>)` before unit processing — replacing the silent
  empty-map path.
- [ ] 3.2 Add the below-floor-coverage guard after the summary computation
  (`scripts/validate-bv.ts:5310`–`:5325`): if `calc` (units with a resolved
  reference) is below the committed floor from task 2.3, print the shortfall and
  `process.exit(<non-zero>)`.
- [ ] 3.3 Make the accuracy gates blocking: after the gate computation
  (`scripts/validate-bv.ts:5326`–`:5328`) and report writes
  (`scripts/validate-bv.ts:5406`–`:5442`), `process.exit(<non-zero>)` when any of
  `g1`/`g2`/`g3` is false; keep the success path exiting 0 only when all three
  pass.
- [ ] 3.4 Use distinct non-zero exit codes for the three conditions (missing
  reference vs below-floor coverage vs gate FAIL) so CI logs disambiguate data
  failures from engine regressions.

## 4. Fix the index schema fidelity

- [ ] 4.1 Correct the `IndexUnit` interface (`scripts/validate-bv.ts:29`) to the
  real `index.json` schema — drop `bv`/`cost` or mark them optional
  (`bv?: number` / `cost?: number`) — matching the verified keys
  `id, chassis, model, tonnage, techBase, year, role, rulesLevel, path`.
- [ ] 4.2 Update reference-BV resolution (`scripts/validate-bv.ts:5217`–`:5220`)
  to source reference BV from the committed dataset; if an index `bv` is present
  it MAY be a last resort, but its absence MUST route the unit into an explicit
  counted "no reference available" tally that feeds the task 3.1/3.2 fail-loud
  guards — never a silent per-unit exclusion that leaves the gate green.

## 5. Wire the gate into the blocking lane

- [ ] 5.1 Confirm `package.json`'s `validate:bv` script propagates the non-zero
  exit, and that the CI BV-validate job (`.github/workflows/pr-checks.yml`)
  treats a non-zero exit as a job failure (it is a real blocking gate now).
- [ ] 5.2 Reconcile the documented parity figure: re-run the gate against the
  committed dataset, and update the `MEMORY.md` / `docs/audits/2026-06-12-full-codebase-review.md`
  D-1 row to the reproduced "within 1% (N/total)" value — assert the reproduced
  number, do not re-quote the old figure unverified (design D5).

## 6. Verification

- [ ] 6.1 Run `npm run validate:bv` (or `npx tsx scripts/validate-bv.ts`) from a
  clean checkout with the committed dataset present: confirm `Calculated: <floor>`
  is at/above the floor, the gates print PASS, and the process exits **0**.
- [ ] 6.2 Run the negative cases: temporarily move the reference dataset aside and
  confirm a **non-zero** exit (task 3.1); cap coverage below the floor and confirm
  a **non-zero** exit (task 3.2); confirm task 1.3's red probe now passes.
- [ ] 6.3 Full verification: `npx tsc --noEmit --skipLibCheck` (the corrected
  `IndexUnit` interface compiles), lint, the affected Jest/CI smoke suites green,
  and run `npx openspec validate restore-bv-parity-reproducibility --strict`.
