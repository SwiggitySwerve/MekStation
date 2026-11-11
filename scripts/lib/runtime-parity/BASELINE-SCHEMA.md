# Nightly gate: baseline, facts and report schema

The gate (`scripts/lib/runtime-parity/gate.mjs`) is the one owner of the comparison. A port writes **facts**
(`facts.ndjson`, derived from its rows and the Java reference). The committed **baseline**
(`config/parity-runtime/baseline-<measure>.json`) holds the same facts per unit at a SHA. The gate fails a unit that
gets worse. The workflow only runs it and publishes its files.

```sh
node scripts/lib/runtime-parity/gate.mjs --measure <load|reopen> --run-dir <port output dir> \
  [--baseline config/parity-runtime/baseline-<measure>.json] [--last-green <last-green.json>] [--repo <root>] [--out <dir>]
```

Exit `0` pass, `1` regression (a unit got worse, or a baseline unit was removed or renamed), `2` fail closed. It reads
`<run-dir>/receipt.json` and `<run-dir>/facts.ndjson`, and writes (default `<run-dir>/gate/`) `gate-report.json`,
`gate-units.ndjson`, `proposed-baseline.json` (when the inputs were readable) and, on a pass, `last-green.json`.
Rows are unchanged by all of this: `rows.ndjson` and its SHA are exactly what the ports wrote before the gate existed.

## Facts (`facts.ndjson`, one line per unit, sorted by `family/unitId`)

```
{ schemaVersion: 1, measure: "load"|"reopen", family: string, unitId: string, path: string,
  status: "ok"|"error", facts: { <name>: <value> } }
```

Every fact can be `null` = **unknown**. Unknown is never a pass. An error row has every fact `null`. Three kinds:

| kind       | value                                        | pass / better                               | worse                                                |
| ---------- | -------------------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `bool`     | `true`, `false`, `null`                      | `true` (a `false` -> `true` is a gain)      | `true` -> `false`                                    |
| `distance` | number >= 0, or `null`                       | smaller (a drop beyond tolerance is a gain) | grows beyond `1e-9 * max(1, baseline)`               |
| `set`      | sorted, duplicate-free `string[]`, or `null` | fewer members (a strict subset is a gain)   | gains a member (a swap with the same count is worse) |

Any known baseline value becoming `null` tonight is worse. A `null` in the baseline claims nothing.

### `load`

| fact           | kind     | meaning                                                                       |
| -------------- | -------- | ----------------------------------------------------------------------------- | -------------------- | --------------------------------- |
| `bvExact`      | bool     | runtime BV equals the Java BV (a null BV is `false`; no Java value is `null`) |
| `bvDistance`   | distance | `                                                                             | runtime BV - Java BV | ` (`null` when either is unknown) |
| `validity`     | bool     | runtime validity equals Java's                                                |
| `weightOwners` | bool     | the status bar's `weightUsed` equals the validator's `allocatedWeight`        |

### `reopen`

| fact                       | kind     | meaning                                                                                                                                              |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --- |
| `reopenLoad`               | bool     | reopen BV equals load BV (a null BV at either end is `false`)                                                                                        |
| `reopenJava`               | bool     | reopen BV equals the Java BV                                                                                                                         |
| `reopenJavaDistance`       | distance | `                                                                                                                                                    | reopen BV - Java BV | `   |
| `noLossConfirmationBefore` | bool     | the loaded store would not make the save dialog ask; unsettled or unknown tracking is `null`                                                         |
| `noticeResidual`           | set      | the loader's notice residual cells, `JSON.stringify([location, slot, text])` each                                                                    |
| `noticeMismatch`           | set      | cells the notice and the round trip disagree on, `["notice-only"\|"round-trip-only", location, slot, text]` (what `noticeResidual.equal` summarises) |
| `rawIdentityLosses`        | set      | every lost or rewritten source cell, unfiltered, as `[location, slot, text]`                                                                         |
| `loadedMountLosses`        | set      | loaded mounts no reopened mount accounts for, as canonical JSON (sorted keys)                                                                        |
| `reopenValid`              | bool     | validity after reopen is `valid` (valid at load -> invalid after reopen is the regression)                                                           |

## Baseline (`config/parity-runtime/baseline-<measure>.json`)

Written **only** by a port's `--write-baseline`; never by hand (the population hash and the notes check make a hand
edit fail closed).

```
{
  schemaVersion: 1,
  measure: "load"|"reopen",
  sha: string,                 // 40 hex: the commit the run was made at; must be an ancestor of any run it gates
  populationCount: number,     // = the number of keys in `units`
  populationHash: string,      // 64 hex: sha256 of the sorted unit keys joined by "\n", newline-terminated
  notes: [{ sha: string,       // 7-40 hex: the merge or head SHA the change is recorded against
            pr: number|null,   // positive integer, or null for a seed
            reason: string,    // non-empty
            units: string[] }],// unit keys the change names (may be empty for a seed); at least one note
  units: { "<family>/<unitId>": { <every fact of the measure>: value } }
}
```

Fail closed (exit 2): file missing; not valid JSON or not this schema; `measure` differs; a gated fact missing from, or an
unknown fact present in, any unit; `populationCount` or `populationHash` not matching `units`; `sha` not an ancestor of
the run (`git merge-base --is-ancestor`); facts or receipt missing, malformed, narrowed (`--units`) or short of the
population.

### Writing it

`node scripts/runtime-path-bv/run.mjs --out <dir> --write-baseline --reason "<why>" [--pr <n>]` (and the same for the
reopen port) writes the file after the run, appending a note to any earlier ones. It **refuses**, writing nothing (exit 1,
`failure.json` `BASELINE_REFUSED`), for a narrowed run, two runs that are not byte-identical, or any unit that failed or
has an unknown fact. A PR that removes or renames units, or intentionally gains, regenerates the baseline with a note.

The file is valid JSON with **one unit per line** (`serializeBaseline`), so a diff names the units that changed. Measured on the
accepted full-population rows: the load baseline is about 446 KB (4,263 units); the reopen baseline is about 13.4 MB, nearly all of
it the `rawIdentityLosses` set (243,753 members), because the inclusion rule needs the members, not a count.

## Population and last green

- **Added units** (in tonight's run only) are _unbaselined_: counted in the headline (`N unbaselined`), listed by id, never
  a fail. **Removed or renamed units** (in the baseline only) count as known -> unknown and fail, by id.
- **Last green** (`last-green.json`, written on a pass): `{ schemaVersion: 1, measure, runSha, baselineSha256, units:
{ key: facts } }`. The next night tightens to the best of each fact **only while** `baselineSha256` equals the sha256 of
  the committed baseline file bytes. A missing, expired, unreadable or stale artifact means the committed baseline alone;
  the report says so (`lastGreen.status`: `applied`, `missing`, `stale`) and the night does not fail for it.
- **Unprotected gains** (better than the committed baseline) are listed in `gate-report.json` and folded, with unbaselined
  units, into `proposed-baseline.json` for the rebaseline PR; the gate itself never writes the baseline.

## `gate-report.json`

`{ schemaVersion, measure, runSha, exitCode, failClosed: [{reason, message}], regressions: [{unit, fact, source:
"baseline"|"last-green", base, tonight, why, added?}], gains, unprotectedGains, unbaselined: string[], removed: string[],
population: {baseline, tonight, overlap}, lastGreen: {status, detail}, headline }`. `gate-units.ndjson` has one line per
regression, gain and unbaselined unit. Fail-closed reasons: `BASELINE_MISSING`, `BASELINE_MALFORMED`,
`BASELINE_SHA_NOT_ANCESTOR`, `BASELINE_SHA_UNCHECKABLE`, `RUN_INCOMPLETE`, `RUN_NARROWED`, `FACTS_MALFORMED`.
