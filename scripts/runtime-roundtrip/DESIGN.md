# Runtime round trip (reopen = load after save): design, for C1/C3 confirmation

Status: skeleton only. This branch is stacked on `feat/runtime-path-bv-port` (it needs the shared row schema,
compare rules and S0b join modules). No capture code is written yet; the decisions below come first.

## Contract (same as the load port, C5's hosted workflow)

`node scripts/runtime-roundtrip/run.mjs --out <dir> [--sources <dir>] [--mekfiles <dir>] [--units a,b] [--runs 2]`.
Outputs under `<dir>`: `rows.ndjson` (schema rows, `measure: reopen`), `summary.json`, `receipt.json`, plus `failure.json` on
an incomplete census. Exit non-zero only if the census did not complete. The join comes from the S0b emitter output through the
load port's `obtainJoin`; the Java values from the committed reference through `prepareReference`.

## Per-unit chain (one fresh SQLite file per run)

1. Open the committed unit through the real canonical open (same as the load port).
2. **before** observation: BV, validity, `weightUsed`, `allocatedWeight`, MP, BV terms.
3. `serializeCustomUnitState` then a JSON round trip, then a **cold save**: `UnitRepository.create({chassis, variant, data})` into
   `<out>/work/run-N/reopen.db`; close the database and reset both singletons; open a fresh connection on the same file;
   `getById(id)`; `JSON.parse(record.data)`.
4. `parseUnit` (contract parse), `UnitLoaderService.mapToUnitState(parsed, false)`, a unit store from that state.
5. **after** observation, with the same observer as step 2.
6. Comparisons ported from C3's v2 census (`census.cjs`), unchanged in meaning: source cells vs reopened source cells, system
   cells by exact identity (`isMTFCriticalSlotSystemName` from `MTFVocabulary.ts`, never a substring), owner bucket and kind from the
   notice classifier, token changes, `rawIdentityLosses`, notice-residual equality, loaded-mount losses/changes/additions (with the
   owned `cells`), and the metric changes.

## What was probed (plain Node, `node --require tsx/cjs`, cwd at the repo root)

- The whole cold chain works: create, close, reopen, `getById`, parse, load, about 3 s for one unit including migrations; equipment
  counts round-trip (Atlas AS7-D: 20 to 20). `EquipmentFileReader` falls back to `public/` outside a browser, so no mocks.
- The status-bar hook (`useUnitEditorRoutingStats`) renders under `react-dom/server`: Atlas gives BV 1897, `weightUsed` 100, MP 3/5/0,
  the same as the Jest capture.
- BV terms are the catch. The load capture gets `breakdown` from a spy on `calculateUnitBV` (`jest.mock`), and plain Node cannot
  spy on a transpiled export. Recomputing terms with a second `projectEditableMech(...)` call would copy the hook's input projection.

## Decision needed: run the reopen capture under Jest, with one shared observer

Proposal: `capture.jest.js` for the reopen port, and the status-bar observer (`StatusProbe`, the calculator spy, the debounce
advance, the weight cross-check, the terms) extracted into `scripts/lib/runtime-parity/` so the load and reopen captures call one
function (one owner; load = before and reopen = after are then the same read by construction). The extraction is a small
refactor of the load capture that must leave its rows byte-identical (re-run the 5-unit smoke to prove it). It changes C3's
reviewed file, so it lands on the load branch first.

Alternative: plain Node like v2 (60 to 90 s per run, no jsdom), reading BV, weight and MP from the hook and terms from a direct
`calculateUnitBV`. Faster, but `before` would not be the load port's read, and the terms would use a second projection.

## Other points for C3

- `UnitRepository.create` rejects a duplicate (chassis, variant). The catalog's names are expected to be unique, so real names are
  used and a collision shows up as an error row at stage `save`, not as a hidden skip.
- Validity: the load port reads `useUnitValidation().result.isValid` after the real debounce; v2 called `validateUnit` on
  `projectMechValidation`. The shared observer would use the hook for both ends.
- Wall time: v2 was 60 to 90 s plain Node. Under Jest plus SQLite I expect roughly the load port's cost per unit again; two runs of
  both ports together may land above C5's 10-minute budget. To be measured on a small slice once built; sharding or sampling is
  C5's and Root's call, and the population is never cut silently.
