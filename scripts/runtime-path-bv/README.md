# Runtime-path BV (load = Java)

Measures what the app computes for every committed BattleMech: committed unit JSON, then the real
canonical open (`CanonicalUnitService`, `loadUnitIntoTab`, `UnitLoaderService`, mapper, unit store), then the
real status-bar hooks and UI. For each unit it records BV, validity, weight, MP and the BV terms
(`numericTerms(mechBVTerms(breakdown))`), and counts agreement with the committed Java reference.

```sh
node scripts/runtime-path-bv/run.mjs --out <dir> [--sources <dir>] [--mekfiles <dir>] [--units a,b] [--runs 2]
```

Run from the repository root after `npm ci`. Everything is written under `<dir>`:

| File                      | Content                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rows.ndjson`             | one schema row per unit (`scripts/lib/runtime-parity/ROW-SCHEMA.md`); identical on every host                                                    |
| `summary.json`            | counts: units, errors by stage, BV exact/different/missing, validity agree/disagree/missing, `headline`                                          |
| `receipt.json`            | Node, platform, repo SHA, input hashes, scope, per-run time and `process.resourceUsage()` (never a gate)                                         |
| `java-differences.ndjson` | every unit that is not an exact BV or validity match (observed and Java value), and every unit whose `weightUsed` differs from `allocatedWeight` |
| `failure.json`            | only when the run did not complete: a named `reason`                                                                                             |
| `work/`                   | per-run capture logs and raw records                                                                                                             |

## Inputs

- **Join:** S0b's committed-catalog emitter output (`sources.ndjson` + `sources.ndjson.manifest.json`). `--sources <dir>`
  reads an existing output; otherwise the emitter runs as a child step (`scripts/ci/committed-catalog-sources.ts`) in its
  repo-only mode (`--reference-only`: Git, tsx and committed files only, no mm-data, Python or JVM), which is what the hosted
  job uses. `--mekfiles <pinned mm-data>/data/mekfiles` switches it to the local source-text mode. The emitter must be on the
  ref being run (it is S0b's file). The source is one function, `obtainJoin` in `scripts/lib/runtime-parity/join.mjs`.
- **Java values:** `config/reference/reference-full.jsonl.gz`, verified by the scoreboard's own `prepareReference`.
- No network, no JVM, no `_scratch`.

## Exit code

Non-zero only if the census did not complete: `S0A_REFERENCE_MISSING`, `S0B_MANIFEST_MISSING`, `INPUT_SHA_DRIFT`,
`MISSING_MANIFEST_ROWS`, `ZERO_UNITS_MEASURED`, `UNSUPPORTED_FAMILY`, `CAPTURE_INCOMPLETE`,
`CAPTURE_INFRASTRUCTURE_FAILURE`, `POPULATION_MISMATCH` (a capture must give exactly one record per planned unit), or
`NONDETERMINISTIC_ROWS` (two fresh capture processes must give byte-identical rows).
Parity differences never fail the run. `--units` narrows the run for local work (ids are sorted and de-duplicated) and is
recorded in `receipt.scope` with `populationCount`, so a narrowed run can never pass as the whole population.

## Compare tool

`node scripts/runtime-path-bv/compare.mjs --rows <rows.ndjson> --out <dir> [--scratch <C3 scratch rows.jsonl>] [--java-terms]`

- `--scratch`: acceptance. Port rows against the scratch harness's rows on the same SHA, unit by unit (BV exactly, terms with C1's
  tolerance, validity, the issue sequence); lists every differing and unmatched unit in `compare-differences.ndjson` and exits 1 on any.
  Weight and MP are not in the scratch load rows and are reported as not comparable.
- `--java-terms`: term-wise against the committed Java reference with C1's mapping (`compare-family.cjs`): raw keys, no folding,
  absent terms counted by category; unequal terms in `java-term-differences.ndjson`. It never fails the run.
- The rules live in `scripts/lib/runtime-parity/compare.mjs` (shared with the reopen port).

## Files

`run.mjs` is the load measure's spec over the shared orchestrator `scripts/lib/runtime-parity/census.mjs` (inputs, population proof,
fresh captures, byte-identity gate, outputs, exit code; also used by the reopen runner); `join.mjs` (same lib) reads the join and
builds the plan; the status-bar read itself is the shared observer
`scripts/lib/runtime-parity/status-observer.js` (one owner, also used by the reopen capture); `capture.jest.js` is the Jest/jsdom capture
(selected only by `config/jest/runtime-path-bv.config.js`, and not named `*.test.*`, so default discovery never runs it);
`report.mjs` maps records to rows and counts. Tests: `node --test scripts/runtime-path-bv/run.test.mjs`.
Families: battlemechs first; BA/infantry and the others follow.
