# Runtime-path BV (load = Java)

Measures what the app computes for every committed BattleMech: committed unit JSON, then the real
canonical open (`CanonicalUnitService`, `loadUnitIntoTab`, `UnitLoaderService`, mapper, unit store), then the
real status-bar hooks and UI. For each unit it records BV, validity, weight, MP and the BV terms
(`numericTerms(mechBVTerms(breakdown))`), and counts agreement with the committed Java reference.

```sh
node scripts/runtime-path-bv/run.mjs --out <dir> [--sources <dir>] [--mekfiles <dir>] [--units a,b] [--runs 2]
```

Run from the repository root after `npm ci`. Everything is written under `<dir>`:

| File                      | Content                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `rows.ndjson`             | one schema row per unit (`scripts/lib/runtime-parity/ROW-SCHEMA.md`); identical on every host            |
| `summary.json`            | counts: units, errors by stage, BV exact/different/missing, validity agree/disagree/missing, `headline`  |
| `receipt.json`            | Node, platform, repo SHA, input hashes, scope, per-run time and `process.resourceUsage()` (never a gate) |
| `java-differences.ndjson` | every unit that is not an exact BV or validity match, with the observed and Java value                   |
| `failure.json`            | only when the run did not complete: a named `reason`                                                     |
| `work/`                   | per-run capture logs and raw records                                                                     |

## Inputs

- **Join:** S0b's committed-catalog emitter output (`sources.ndjson` + `sources.ndjson.manifest.json`). `--sources <dir>`
  reads an existing output; otherwise the emitter runs as a child step (`scripts/ci/committed-catalog-sources.ts`, which
  today needs `--mekfiles <pinned mm-data>/data/mekfiles` and Python). The source is one function, `obtainJoin` in `join.mjs`.
- **Java values:** `config/reference/reference-full.jsonl.gz`, verified by the scoreboard's own `prepareReference`.
- No network, no JVM, no `_scratch`.

## Exit code

Non-zero only if the census did not complete: `S0A_REFERENCE_MISSING`, `S0B_MANIFEST_MISSING`, `INPUT_SHA_DRIFT`,
`MISSING_MANIFEST_ROWS`, `ZERO_UNITS_MEASURED`, `UNSUPPORTED_FAMILY`, `CAPTURE_INCOMPLETE`,
`CAPTURE_INFRASTRUCTURE_FAILURE`, or `NONDETERMINISTIC_ROWS` (two fresh capture processes must give byte-identical rows).
Parity differences never fail the run. `--units` narrows the run for local work and is recorded in `receipt.scope`.

## Files

`run.mjs` orchestrates; `join.mjs` reads the join and builds the plan; `capture.jest.js` is the Jest/jsdom capture
(selected only by `config/jest/runtime-path-bv.config.js`, and not named `*.test.*`, so default discovery never runs it);
`report.mjs` maps records to rows and counts. Tests: `node --test scripts/runtime-path-bv/run.test.mjs`.
Families: battlemechs first; BA/infantry and the others follow.
