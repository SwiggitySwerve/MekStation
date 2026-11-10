# Parity scoreboard

This module owns the report-only fresh-conversion census and its previous-main
comparison. It calls the existing converters and comparators; it does not define
construction or BV rules. It never changes PR Checks or branch protection.

## Workflow and inputs

`parity-scoreboard.yml` runs on main pushes and manual dispatch with a required
`ref` input. Separate checkouts keep the workflow's tooling and pinned oracle
available when the target ref predates this workflow. The recorded census HEAD
is the target checkout's actual HEAD. Inputs, outputs and mm-data stay under
runner temp, outside that checkout.

Python is pinned to the 3.12 minor, with C1's six packages locked by wheel hashes
in `parity-scoreboard-requirements.txt`. `run-provenance.json` records the exact
interpreter version. Local compatibility proof uses C1's Python 3.12.13; if a
hosted runner selects another 3.12 patch, its output establishes the CI baseline.
No cross-patch or cross-platform byte identity is claimed.

`config/reference/parity-scoreboard.json` owns the input checksums. Preparation
verifies the compressed reference, decompressed reference and unchanged sidecar.
The cached mm-data tarball is verified on every run, then only `data/mekfiles`
is extracted. Its full commit is pinned in that manifest. Java is not required.

The reference is MegaMek-derived output from pinned MegaMek 48fcb2f64 over public
mm-data 50f7efe. The repository already commits this class of data in
`scripts/data-migration/megamek-bv-cache.json`. The repository's licence statement
is under owner review (architecture review §4.4); this addition does not settle
licensing.

## Execution contract

The local default preserves C1's pipeline exit-0 guard. The workflow explicitly
passes `--report-mode`: pipeline exits 0/1 count as ran only with complete sources,
aggregate report and aggregate rows (9,815 rows each), the full expected family
inventory, successful reference trust and the pipeline's final `execution.json`
completion marker. Stale completion evidence is removed before execution. Exit
1 alone cannot establish completion. Exits >=2, signals and spawn errors fail.
Detailed exits 0 and 1 both mean the census ran; missing outputs and rejected
reference trust fail the job. Parity differences do not fail this workflow. The runner rejects
a dirty target, the wrong reference or sidecar, and changes to HEAD, tree, policy
or reference during execution. Runtime logs and provenance record each subprocess.

The port preserves C1's `combined.cjs` tally, category rules, field ordering and
optional-total comparison, including its existing diagnostic limitations.
`RESULTS.json` stays compatible with that harness. The additional snapshot uses
that same BV tally for finite/missing counts by family.

S0a omits the W2 infantry extra. Infantry weight terms remain an input/coverage
limitation; inspect missing-local and missing-reference counts in the reports.
`--extra` accepts only C1's SHA-verified W2 input for local byte-stability proof.
The workflow never supplies it. Committed-catalog comparisons are out of scope.

## Artifacts and baseline

`parity-scoreboard-reports` retains `RESULTS.json`, the aggregate report and
completion marker, the detailed reports, runtime
provenance/logs, `scoreboard-diff.json`, `scoreboard-row-index.json` and the summary
for 30 days. `parity-scoreboard-rows` retains gzipped detailed rows and
`sources.ndjson` for 14 days.

The baseline is the latest successful main-push run of this workflow, excluding
the current run, with a retained report artifact. Dispatches never become main
baselines. Run and artifact lists are paginated. No retained baseline means
`baseline: null`, with unavailable differences rather than invented zeros.
API/download errors and mismatched artifact identities are errors.

Snapshot schema version 1 records run ID, attempt, actual target SHA, interpreter,
per-family BV/validity/weight/settings counts and row hashes. A row key is
`[family, path]`; a source edit changes that row. Duplicate keys are rejected.
Hashes cover the serialized row, so the four row-file comparisons count added,
removed, changed and unchanged rows without downloading expired row artifacts.
The JSON diff and job summary use the same comparison result.

## Local invocation and byte proof

From a clean target checkout, using an external output directory:

```sh
node /path/to/tooling/scripts/ci/parity-scoreboard.mjs prepare --out /scratch/inputs
node /path/to/tooling/scripts/ci/parity-scoreboard.mjs verify-mm-data --archive /scratch/mm-data.tar.gz
node /path/to/tooling/scripts/ci/parity-scoreboard.mjs run \
  --reference /scratch/inputs/reference-full.jsonl \
  --mekfiles /scratch/mm-data/data/mekfiles \
  --python /path/to/python3.12 --out /scratch/census
node /path/to/tooling/scripts/ci/parity-scoreboard-github.mjs --out /scratch/census --local
```

`--local` explicitly omits GitHub lookup and writes `baseline: null`. CI requires
the repository, run ID and attempt from GitHub's environment. Output labels may
be reused: the runner removes prior detailed outputs before executing so stale
files cannot masquerade as a completed census.

For the compatibility proof, run unmodified `combined.cjs` and this runner on
the same clean commit with identical reference, mekfiles, Python and optional W2
input. Compare all nine detailed files (four reports, four row files and
reference provenance), `sources.ndjson`, and `RESULTS.json` excluding only
head/tree. Runtime paths, harness hashes, command metadata and timestamps in
`run-provenance.json` naturally differ and are not parity output. Then run the
workflow mode separately without W2.

The reference gzip was produced with Python 3.12.13 / zlib 1.3.1, level 9,
`mtime=0`, and no filename, using `gzip.GzipFile(fileobj=io.BytesIO(), filename='',
mode='wb', compresslevel=9, mtime=0)`. Repeat with that compression toolchain;
other zlib implementations can produce different valid compressed bytes.
The manifest pins both compressed and decompressed SHA-256 values.

The sidecar retains its original CRLF bytes. Its exact path is marked `binary`
in `.gitattributes` and listed in `.oxfmtignore`. An exact-path CRLF override in
`.oxfmtrc.json` also preserves it when the commit hook passes the file explicitly
to oxfmt (explicit arguments bypass the ignore file). The co-located test checks
the original SHA-256 and CRLF bytes. Git detects the gzip as binary automatically.

Run the co-located `node --test scripts/ci/parity-scoreboard*.test.mjs` tests and
the complete CI test directory. The workflow tests enforce Python 3.12,
permissions, retention, dispatch checkout, and exclusion from the PR census.
