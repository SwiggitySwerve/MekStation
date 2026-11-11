# Runtime round trip (reopen = load after save)

Measures what the app computes for every committed BattleMech before and after a real, cold save: the real canonical
open, the shared status-bar observation (**before**), serialize, a cold SQLite save through `UnitRepository`, the real
loader on what comes back from disk, a fresh unit store and the same observation (**after**). Rows carry both ends, the
lost source cells, the notice-residual equality, token changes and the changed, lost and added loaded mounts with the cells
they own (`scripts/lib/runtime-parity/ROW-SCHEMA.md`).

```sh
node scripts/runtime-roundtrip/run.mjs --out <dir> [--sources <dir>] [--mekfiles <dir>] [--units a,b] [--runs 2]
```

Run from the repository root after `npm ci`. The contract is the load port's (same inputs, same exit code, same files):
`rows.ndjson`, `summary.json`, `receipt.json`, `reopen-differences.ndjson`, `failure.json` on an incomplete census, and
`work/run-N/` with each capture's log, raw records and `sqlite-receipt.json`. The orchestration is the shared
`scripts/lib/runtime-parity/census.mjs`; `run.mjs` is only the reopen measure's spec.

## What is cold

As in C3's accepted census: every unit is written inside **one committed transaction** into a fresh database file
(`work/run-N/reopen.db`, one per capture process), the database is **closed** and a **fresh connection opened** once, and the
unit-store registry and tab manager are **cleared** before any read. Each readback is deep-compared with what was saved
(`sqlite-receipt.json` counts written, read and equal), the reopened store is asserted not to be the saved one, and the load
side of every row is observed by the same observer in the same process, never read from a stored file. `variant` is the unit
id, so catalog names cannot collide.

## One observer

Both ends use `scripts/lib/runtime-parity/status-observer.js`, the function the load capture uses, so load BV (`before.bv`) and
reopen BV (`after.bv`) are one read by construction. Weight is the status bar's `weightUsed`; `allocatedWeight` is read from the
real validator input hook beside it, and the summary counts any unit where they differ at either end.

## Comparisons

`round-trip-diff.cjs` is C3's v2 logic: source cells against reopened cells, system cells by exact identity from
`MTFVocabulary.ts` (never a substring), owner bucket and kind from the notice classifiers, token changes, the unfiltered
`rawIdentityLosses`, the notice-residual equality, and the mount matching with owned cells. It does no observation.

## Counts

`summary.json` counts reopen = load, reopen = Java and load = Java (a null BV at either end and every error row are misses),
unit-level notice equality, weight owners, lost non-system cells by bucket, and mounts lost, changed and added.
`reopen-differences.ndjson` lists every unit whose reopen BV is not its load BV.

The third number, **saves with no loss confirmation**, is `summary.noLossConfirmation.before` (and the headline's
`no loss confirmation (before save) n/units`): rows whose loaded store would not make the save dialog ask, i.e. settled, loss tracking known,
no `unrecoveredCriticalSlots` entries and no `armorSaveLoss`. Each row's `saveLoss` carries those inputs as the dialog gets them
(read from the real `useUnitLoadDiagnostics()` by the shared observer, `getArmorSaveLoss` called not recomputed, entries with
`bucket`/`effectId`/`kind`/`responsibility`); `saveLossAfter` carries the same facts for the reopened store.
**The published nightly number is the BEFORE side.** `summary.noLossConfirmation.after` (and `summary.saveLossDetail.after`) is labelled
"loss already written to file; not a progress measure" and is never quotable as progress: after one cold save the warning has been shown
once and the loss is permanent in the file, so a high AFTER count means the opposite of improvement. It is not in the headline. The other
counts are under `summary.saveLossDetail.before` / `.after`; there is no `summary.saveLoss`.
The rule lives in `scripts/lib/runtime-parity/save-loss.mjs` (one file, so C3's stage-1 comparator can replace the source later).
Error and unsettled rows stay in the denominator and are never counted. Unknown
tracking is a harness failure for canonical loads (the capture asserts the loader supplied the list) and is never an empty list.

## Compare tool

`node scripts/runtime-roundtrip/compare.mjs --rows <rows.ndjson> --ref <A-units.json> --out <dir> [--receipt <receipt.json>] [--subset] [--require-same-sha]`
checks the port's per-unit load and reopen BVs against a reference census of the same SHA (C3's `A-units.json`), requires the
unit sets to be identical (`--subset` says a run was deliberately narrowed), and lists every difference. A port branch's HEAD is
never the reference's SHA, so the SHA is recorded unless `--require-same-sha` is given; prove the product tree is identical with
`git diff <runtimeSHA> HEAD -- src public`.

## Files

`run.mjs` (spec), `capture.jest.js` (the Jest/jsdom capture, selected only by `config/jest/runtime-roundtrip.config.js`, not
named `*.test.*`), `round-trip-diff.cjs`, `report.mjs` (rows and counts), `compare.mjs`. Tests: `node --test
scripts/runtime-roundtrip/run.test.mjs scripts/runtime-roundtrip/compare.test.mjs` (name the files; a directory is not accepted).
Families: battlemechs first.
