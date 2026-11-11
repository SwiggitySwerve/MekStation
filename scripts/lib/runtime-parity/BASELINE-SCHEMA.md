# Nightly gate: facts, baseline and report schema

The gate (`scripts/lib/runtime-parity/gate.mjs`) is the one owner of the comparison. A port writes **facts**
(`facts.ndjson` + `facts-meta.json`, derived from its rows and the Java reference by `facts.mjs`). The committed
**baseline** holds the same facts per unit at a SHA, as text a reviewer can read in a PR diff. The gate fails a unit that
gets worse. The workflow only runs it and publishes its files.

```sh
node scripts/lib/runtime-parity/gate.mjs --measure <load|reopen> --run-dir <port output dir> \
  [--baseline config/parity-runtime/baseline-<measure>.json] [--last-green <last-green.json>] [--repo <root>] [--out <dir>]
```

**Exit codes:** `0` pass. `1` a **measured regression** (a unit got worse). `2` **fail closed** (the gate could not
trust its inputs, or a baseline unit was removed or renamed). It reads `<run-dir>/receipt.json`, `<run-dir>/facts.ndjson`
and `<run-dir>/facts-meta.json`, and writes (default `<run-dir>/gate/`) `gate-report.json`, `gate-units.ndjson`,
`proposed-baseline.json` (when the inputs were readable) and, on a pass, `last-green.json`. Rows are not changed by any of
this: `rows.ndjson` and its SHA are exactly what the ports wrote before the gate existed.

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
| -------------- | -------- | ----------------------------------------------------------------------------- |
| `bvExact`      | bool     | runtime BV equals the Java BV (a null BV is `false`; no Java value is `null`) |
| `bvDistance`   | distance | `abs(runtime BV - Java BV)` (`null` when either is unknown)                   |
| `validity`     | bool     | runtime validity equals Java's                                                |
| `weightOwners` | bool     | the status bar's `weightUsed` equals the validator's `allocatedWeight`        |

### `reopen`

| fact                       | kind     | meaning                                                                                                                                                     |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reopenLoad`               | bool     | reopen BV equals load BV (a null BV at either end is `false`)                                                                                               |
| `reopenJava`               | bool     | reopen BV equals the Java BV                                                                                                                                |
| `reopenJavaDistance`       | distance | `abs(reopen BV - Java BV)`                                                                                                                                  |
| `reopenLoadDistance`       | distance | `abs(reopen BV - load BV)`, independent of Java, so a unit already failing reopen = load still shows when it gets worse                                     |
| `noLossConfirmationBefore` | bool     | the loaded store would not make the save dialog ask; unsettled or unknown tracking is `null`                                                                |
| `noticeResidual`           | set      | the loader's notice residual cells                                                                                                                          |
| `noticeMismatch`           | set      | cells the notice and the round trip disagree on (what `noticeResidual.equal` summarises): `n:<cell>` only the notice has it, `r:<cell>` only the round trip |
| `rawIdentityLosses`        | set      | every lost or rewritten source cell, unfiltered                                                                                                             |
| `loadedMountLosses`        | set      | loaded mounts no reopened mount accounts for, as canonical JSON (sorted keys)                                                                               |
| `reopenValid`              | bool     | validity after reopen is `valid` (valid at load -> invalid after reopen is the regression)                                                                  |

### Set members

A cell is `<location code>:<zero-based slot>:<token text>`, e.g. `LT:4:AC/10`; the token may contain colons (split at the
first two). Codes: `HD CT LT RT LA RA LL RL CL FLL FRL RLL RRL`; a location outside the table is `~<name>` (so the encoding is
total and exactly reversible). Members are sorted as plain strings. There are no index tables: a line never changes because
another line did.

### `facts-meta.json` (provenance of the facts)

```
{ schemaVersion: 1, measure, factsSchemaVersion: number, factsDeriverBlob: string /* 40 hex */, referenceSha256: string /* 64 hex */ }
```

`factsDeriverBlob` is the git blob sha of `facts.mjs` over its LF-normalised bytes (so Windows and Linux agree), computed by
`facts-provenance.mjs`; `facts.mjs` itself stays the one pure deriver (a row and the Java reference row in, facts out).
`referenceSha256` is the sha256 of the committed Java reference the facts were derived against.

## Baseline: two text files per measure

Written **only** by a port's `--write-baseline`; never by hand (the population hash, the sidecar check and the notes
make a hand edit fail closed). Both are text, one unit per line, sorted, so a PR diff names the units that moved. **No
gzip, no index tables.**

### `config/parity-runtime/baseline-<measure>.json` (the reviewed file; valid JSON)

```
{
  "schemaVersion": 1,
  "measure": "load"|"reopen",
  "sha": string,                    // 40 hex: the commit the run was made at; must be an ancestor of any run it gates
  "factsSchemaVersion": number,     // provenance: must equal tonight's facts-meta.json
  "factsDeriverBlob": string,       // 40 hex: git blob of facts.mjs; must equal tonight's
  "referenceSha256": string,        // 64 hex: the Java reference the facts were derived with (a difference is reported, not a failure)
  "populationCount": number,        // = the number of keys in "units"
  "populationHash": string,         // 64 hex: sha256 of the sorted unit keys joined by "\n", newline-terminated
  "notes": [
    {"sha": string, "pr": number|null, "reason": string, "units": string[]}   // one per line; sha 7-40 hex; reason non-empty; at least one note
  ],
  "units": {
    "<family>/<unitId>": { "<every fact of the measure>": value, ... }          // one per line, sorted
  }
}
```

In `units`, a `bool` is `true`/`false`, a `distance` a number, and a **set fact is `{"n": <member count>, "h": "<16 hex>"}`**: the
set's size and its member-set hash, so a reviewer sees which units' sets changed here and which members in the sidecar. (An
unknown value, `null`, is allowed only in an older baseline; `--write-baseline` refuses unknown facts.)

### `config/parity-runtime/baseline-<measure>.sets.ndjson` (the sidecar; only for a measure with set facts: `reopen`)

```
{"u":"<family>/<unitId>","noticeResidual":["LT:4:AC/10", ...],"rawIdentityLosses":[ ... ]}
```

One line per unit, sorted by `u`, **every unit has a line**; a set with no members is omitted from its line. Members are exactly
the facts' members, so the comparison is exact set inclusion. The member-set hash is one function, `setHash(members)` in
`gate.mjs` (first 16 hex of the sha256 of the sorted members joined by `\n`); `--write-baseline` writes both files from
`serializeBaseline`, and the gate recomputes it at load. `load` has no set facts and no sidecar.

### Measured sizes (accepted full-population rows, 4,263 units)

| file                                 | bytes     | lines |
| ------------------------------------ | --------- | ----- |
| `baseline-load.json`                 | 445,813   | 4,279 |
| `baseline-reopen.json`               | 1,597,807 | 4,279 |
| `baseline-reopen.sets.ndjson`        | 7,208,570 | 4,263 |
| `facts.ndjson` (load, CI artifact)   | 963,023   |       |
| `facts.ndjson` (reopen, CI artifact) | 8,517,390 |       |

Size is not a gate. The reopen sidecar is almost all `rawIdentityLosses` (243,753 members), because the inclusion rule needs
the members, not a count.

### Writing it

`node scripts/runtime-path-bv/run.mjs --out <dir> --write-baseline --reason "<why>" [--pr <n>]` (and the same for the reopen
port) writes the files after the run, appending a note to any earlier ones. It **refuses**, writing nothing (exit 1,
`failure.json` `BASELINE_REFUSED`), for a narrowed run, two runs that are not byte-identical, or any unit that failed or has an
unknown fact. A PR that removes or renames units, or intentionally gains, or changes `facts.mjs` or the Java reference,
regenerates the baseline with a note.

## What the gate checks, in order

1. **Run and baseline integrity (exit 2):** the run is the whole population (`RUN_NARROWED`, `RUN_INCOMPLETE`); the baseline
   exists and is well formed (`BASELINE_MISSING`, `BASELINE_MALFORMED`: schema, every gated fact present, `populationCount`,
   `populationHash`).
2. **Sidecar integrity, before anything is compared (exit 2, `BASELINE_SIDECAR_MISMATCH`, naming the unit ids):** the gate
   recomputes each unit's member-set hash and size from its sidecar line and checks them against the main file; the two files
   list exactly the same units; every sidecar line is well formed; the sidecar exists.
3. **Ancestry (exit 2, `BASELINE_SHA_NOT_ANCESTOR`):** `git merge-base --is-ancestor <baseline sha> <run sha>`.
4. **Provenance (exit 2):** tonight's `factsDeriverBlob` differs from the baseline's (`FACTS_DERIVER_CHANGED`) or the facts
   schema version differs (`FACTS_SCHEMA_CHANGED`), or `facts-meta.json` is missing (`FACTS_PROVENANCE_MISSING`). The fix is a
   rebaseline PR. A different `referenceSha256` is reported (`provenance.referenceChanged`), not a failure.
5. **Population:** units only in tonight's run are **unbaselined** (counted in the headline, listed by id, never a fail). A
   baseline unit absent from the run (removed or renamed) is **fail closed**: exit 2, `POPULATION_UNIT_REMOVED`, naming the
   ids. It is not a measured regression.
6. **Measured regressions (exit 1):** a unit that got worse on any fact, by name; known -> unknown counts. If a removal and
   a regression happen together the exit is 2, and both are in the report.

## Last green, gains

- **Last green** (`last-green.json`, written on a pass): `{ schemaVersion: 1, measure, runSha, baselineSha256, units: { key:
facts } }`. The next night tightens to the best of each fact **only while** `baselineSha256` equals the sha256 of the
  committed baseline bytes (main file, a NUL, then the sidecar). A missing, expired, unreadable or stale artifact means the
  committed baseline alone; the report says so (`lastGreen.status`: `applied`, `missing`, `stale`) and the night does not fail
  for it.
- **Unprotected gains** (better than the committed baseline) are listed in `gate-report.json` and folded, with unbaselined
  units, into `proposed-baseline.json` for the rebaseline PR; the gate itself never writes the baseline.

## `gate-report.json`

`{ schemaVersion, measure, runSha, exitCode, failClosed: [{reason, message}], regressions: [{unit, fact, source:
"baseline"|"last-green", base, tonight, why, added?}], gains, unprotectedGains, unbaselined: string[], removed: string[],
population: {baseline, tonight, overlap}, provenance: {deriverChanged, referenceChanged}, lastGreen: {status, detail},
headline }`. `gate-units.ndjson` has one line per regression, removed unit, gain and unbaselined unit. Fail-closed reasons:
`BASELINE_MISSING`, `BASELINE_MALFORMED`, `BASELINE_SIDECAR_MISMATCH`, `BASELINE_SHA_NOT_ANCESTOR`,
`BASELINE_SHA_UNCHECKABLE`, `POPULATION_UNIT_REMOVED`, `FACTS_DERIVER_CHANGED`, `FACTS_SCHEMA_CHANGED`,
`FACTS_PROVENANCE_MISSING`, `FACTS_MALFORMED`, `RUN_INCOMPLETE`, `RUN_NARROWED`.
