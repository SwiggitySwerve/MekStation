# Runtime-parity per-unit row (schema v1)

One JSON object per unit, one line per row (NDJSON, LF, trailing newline), shared by
`scripts/runtime-path-bv` (measure `load`) and `scripts/runtime-roundtrip` (measure `reopen`).
`rows.mjs` is the single owner (zod). `rows.schema.json` and `receipt.schema.json` (JSON Schema 2020-12) are generated
from it with `node scripts/lib/runtime-parity/rows.mjs --write-schema`, and `rows.test.mjs` fails on drift.
Cross-field rules JSON Schema can't express are enforced by `validateRow` and listed below.

## Output directory (hosted contract)

`node <entry> --out <dir>` writes `rows.ndjson` (the table compared unit by unit), `summary.json` (counts) and
`receipt.json` (below). Names are `OUTPUT_FILES` in `rows.mjs`. The workflow adds `run-meta.json` beside them.

## Identity

| Field                          | Meaning                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `schemaVersion`                | `1`                                                                                                    |
| `family`                       | `battlemechs`, `vehicles`, `aerospace`, `capital`, `battlearmor`, `infantry`, `protomechs` (S0b names) |
| `unitId`                       | the committed unit's `id`                                                                              |
| `path`                         | source MTF/BLK path in mm-data, from the S0b join                                                      |
| `sha256`                       | source SHA-256 after CRLF to LF, from the S0b join (the reference's own hash)                          |
| `catalog.path`, `catalog.blob` | committed catalog file and its git blob id, from S0b `joins[]`                                         |

`family` + `path` is the row identity (unique) and is the pair `parity-scoreboard-diff.mjs` already keys on,
so `compareRows` works on these rows unchanged. Rows are sorted by (`family`, `path`, `unitId`) in code-unit order.
`measure` is `load` or `reopen`; `status` is `ok` or `error`. An `error` row has `error {stage, name, message}` and no result block.

## Load row (`measure: load`, `status: ok`) — `load`

- `observed`: `bv` (number, or `null`), `validity` (`valid`/`invalid`), `weight` (editor `allocatedWeight`),
  `mp {walk, run, jump}`, `occupancy` (always `null` now; phase-2 placeholder).
- `terms`: exactly `numericTerms(mechBVTerms(breakdown))`, names unchanged (Java-comparable: `structureBV` includes the gyro,
  `defensiveEquipmentBV` = `defEquipBV` + `armoredComponentBV`, `weapon.<n>.<LOC>.<id>` per mount).
- `issues[]`: every validation issue `{ruleId, channel (errors|warnings|infos), severity, field, message}`; `field` is the raw field.

## Reopen row (`measure: reopen`, `status: ok`) — `reopen`

- `before`, `after`: the load `observed` shape **plus `terms`** (same `numericTerms(mechBVTerms(...))` as `load.terms`), so
  load BV = `before.bv`, reopen BV = `after.bv`, and a crit-only PR can be judged term by term.
- `lostCells[]`: every source cell with nothing at that (location, slot) after reopen, as raw `{location, slot, text}` plus
  `identity` (`system` = exact-identity match against the set owned by `MTFVocabulary.ts`, never a substring; else `non-system`),
  `bucket` (owner: o3a, o3b, o3b-s, Celerity, PR-D, none; `null` for system) and `kind` (`null` for system).
- `tokenChanges[]`: cells present at both ends with changed text: `{location, slot, text, reopenedText}`.
- `rawIdentityLosses[]`: the unfiltered (location, slot, text) triples of `lostCells` and `tokenChanges` together.
- `noticeResidual`: `residual` (the loader's `unrecoveredCriticalSlots`), `noticeOnly`, `roundTripOnly`, `equal`, `reopenedResidualCells`.
- `loadedMountLosses[]`: mounts the loader produced that no reopened mount matches: a mount view plus `bucket`, `kind`, `equipmentCategory`.
- `changedLoadedMounts[]`: same (equipmentId, category, techBase) at both ends but different placement or properties:
  `{before, after, cells, bucket, kind, equipmentCategory}`. A mount can change identity or grouping without any cell lost.
- `addedLoadedMounts[]`: reopened mounts no loaded mount accounts for (for example marker-recovered): a mount view plus `cells`.
- `cells` (on both entry kinds): every `{location, slot}` the mount owns in the reopened unit, across every location (a spread mount
  lists one cell per part; a changed mount's cells are its `after` view's). `validateRow` checks `cells` against the mount's own
  `slots`/`splitSlots`/`spreadSlots` (same set, no repeats).
- **Grouping proof, row-level:** `checkMountOwnership(row, expectedCells)` in `rows.mjs` returns `{ok, overlaps, missing, extra}`: the union of
  the cells owned by the row's added and changed mounts equals `expectedCells` (the caller's cells, for example one bucket's lost cells from
  the BEFORE run) and no cell has two owners. `ownedCellList(row)` lists the owned cells with their owning entry. The compare tool does no
  second ownership computation.
- A mount view is `{equipmentId, category?, techBase?, location?, slots?, splitSlots?, spreadSlots?, isRearMounted?, isOmniPodMounted?, weight?, criticalSlots?, heat?}`;
  the editor-only `instanceId` is excluded, and absent facts stay absent.

Checked by `validateRow`: `equal` is true exactly when `residual` equals the `non-system` `lostCells` and `noticeOnly`/`roundTripOnly` are empty;
`rawIdentityLosses` is exactly `lostCells` + `tokenChanges`.

## Run receipt (`receipt.json`)

Provenance and resource facts live here, never on a row: `repoSha`, `node`, `platform`, `reference.sha256`
(`config/reference/reference-full.jsonl.gz`), `sources.sha256` and `manifest.sha256` (the S0b join inputs as read),
`rows {count, sha256}` (the rows file this receipt describes), `durationSeconds`, and `resources` (`process.resourceUsage()`;
recorded, never a gate). Rows are compared byte for byte across hosts; receipts are compared for identity, and each
port's acceptance report names the Node version on both sides.

## Count definitions

- A **null `bv` counts as a miss in every count** (load = Java, reopen = load, reopen = Java, term-wise counts, completeness).
  It is never skipped and never treated as zero.
- An `error` row counts as a miss in every count and appears in the unit tables with its `stage`.
- Equality is exact on totals; aggregates that depend on list order (large-aero) compare with a tolerance in the compare tool, not in rows.

## C3 checklist, item by item

| C3 item                                                                     | Where                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| one row per unit keyed family + id + source path + MTF SHA                  | identity table above                                                           |
| BV and every `mechBVTerms` term, Java-comparable names                      | `load.terms`, `load.observed.bv`                                               |
| terms on both ends of a reopen row                                          | `reopen.before.terms`, `reopen.after.terms`                                    |
| validity                                                                    | `observed.validity`, `load.issues`                                             |
| load BV and reopen BV                                                       | `reopen.before.bv`, `reopen.after.bv`                                          |
| lost cells as raw triples with exact-identity bucket                        | `reopen.lostCells[]`                                                           |
| notice-residual equality                                                    | `reopen.noticeResidual`                                                        |
| token changes                                                               | `reopen.tokenChanges` (and inside `rawIdentityLosses`)                         |
| changed and added loaded mounts                                             | `reopen.changedLoadedMounts`, `reopen.addedLoadedMounts`                       |
| run provenance: Node version, repo SHA, platform, reference/manifest hashes | run receipt, not rows                                                          |
| no run-varying values, no normalisation fields                              | every object is `strict`; unknown keys are rejected; `rows.test.mjs` proves it |

## Decisions (C3-approved)

Provenance in the receipt; identity/bucket split; `path`/`sha256` key names; the S0b join for reopen rows; `bv: null`.
Left out on purpose: the `chassis` fact triple, the full `bvBreakdown`/`weightBreakdown` beyond `terms`, `editorMovement`,
derived `metricChanges`/`ownerBuckets`, the per-rule `validation` object (passing rules), and the 620-unit aerospace field rows
(a separate file, not this schema).
