# Pinned-source BV comparison

`unit-bv-parity.ts` owns comparison rules for all seven families;
`vehicle-aero-bv-delta.ts` converts inputs and writes reports.
The oracle remains outside the repository. From the repository root:

```text
python -B scripts/megameklab-conversion/export_vehicle_aero_json.py <mekfiles> <scratch> --strict
node node_modules/tsx/dist/cli.mjs scripts/vehicle-aero-bv-delta.ts --converted <scratch>/sources.ndjson --mekfiles <mekfiles> --reference <oracle.jsonl> --out <report-dir>
```

The exporter independently walks every in-scope MTF/BLK source. The runner
rechecks source hashes, then joins path plus SHA-256. Like the pinned Java
exporter, hashing removes CR only when followed by LF. No other bytes change.
Folders `ge`, `advancedbuildings`, `handheld`, `battlefieldsupport` and BFS files
are outside this oracle's scope. There are no per-unit exclusions.

Strict export also writes `sources.ndjson.manifest.json`. The external
`--converted` CLI requires this receipt before calculating anything: exact
payload SHA-256, source count, full scope, and hashes of the current converter
and its data inputs must match. Native source hashes alone cannot detect an
older converter's saved unit payload. Missing or stale receipts require a
fresh export; there is no legacy bypass or command to bless old output.
Converter inputs are conservatively inventoried by
`megameklab-conversion/strict-provenance-inputs.json`; fingerprints normalize
CRLF to LF for portable receipts. Changes to any inventoried helper invalidate
old receipts even if that particular helper did not affect a row.
The receipt establishes conversion provenance; the oracle still owns corpus
completeness and parity. A passing native conversion is separate from proof
of the committed catalog.

Family exports carry their declared family and ordered source folders from
`strict-families.json`. The pipeline stores each producer's receipt alongside
its cached source/computed bytes, with a separate receipt integrity hash.
Before counting a cache hit or sampling `--verify-hits`, it checks the receipt
through the same verifier against the payload, current converter inputs and
expected family/folders. Missing or invalid cached receipts run fresh; failed
fresh production or validation still fails the run. Byte verification includes
the receipt and retains the existing source/computed checks.
The combined publication uses the same Python receipt writer as serial and
family exports. Both writer and verifier use the selected pipeline `--python`.
Receipts establish validity under unchanged inputs, not physical freshness;
`execution.json` retains `hit`/`verified` and explicitly labels each family's
`production` as `fresh` or `cached`.

Mechs use `validate-bv-calculator.calculateUnitBV`; `bvAdapter` runtime totals
and exact counts are separate fields. ProtoMechs use the handler's existing
BV breakdown. Vehicle, aerospace and capital contracts use the real dispatcher.
BA and infantry sources go through the BLK parser, their unit handler and the
shared dispatcher, and compare under the same strict rules; the handler total
and its exact count stay separate fields. A source that does not reach a BA or
infantry dispatcher result is counted not-computable with its reason.

Totals must be positive integers and match exactly. Aggregates must be finite
and not negative; a zero aggregate is real (unarmed designs) and matches only
a zero, so a one-sided zero is an aggregate mismatch, not an invalid row. Their
relative tolerance is `1e-9 * max(1, |a|, |b|)`
to accommodate order-dependent Java floating-point sums. Capital defense-only
results compare defense alone and always count as incomplete. `within1Pct`
includes exact totals; both signed 1% boundaries are inclusive. `farther` excludes
invalid, unsupported, unjoined and incomplete results, which have separate counts.

Exit zero requires every expected family, complete hash joins, valid figures,
exact totals and matching aggregates. Every gap exits one. Sorted JSON/JSONL
reports contain no timestamps and are byte deterministic for the same inputs.

Add `--per-term` to the Java exporter and comparator to include unrounded
stage terms. The exporter generates read-only calculator subclasses in the
external output directory; it never patches MegaMek. Reference identity includes
the stage definition, generator, generated Java, compiled probes and pinned
runtime manifests. `reconstruction.json` lists failures and supported counts.
Capital probes replace their identity-keyed weapon HashMap with a LinkedHashMap
in the probe instance only, preserving source order for reproducible sums.
Per-term aggregates use those probe sums after checking the untouched calculator
within `1e-12` relative tolerance; integer totals must match exactly.
Probes cover every in-scope family, including BA, infantry and ProtoMeks.
Unsupported markers fail reconstruction for every family.

BA retains its native private trooper loop. Protected-stage hooks snapshot each
trooper; reflection reads only the private trooper index. Reconstruction checks
each trooper's defense, offense and base, then the native squad average and
`(0.9 + 0.1 * strength) * strength` factor. Named weapon sections separate
normal weapons, squad support and anti-mek contributions. Common top-level BA
defense/offense retain the factory calculator's last processed trooper semantics.
Infantry records primary/secondary contributions, anti-mek repeats, field guns
and other weapon-stage contributions; summaryModifier captures specialization.
PrimaryBV and secondaryBV use the existing breakdown's per-trooper units.
ProtoMek misc-equipment details include native Quad melee, clamps and electric
discharge values by internal name and location. Quad chassis alone adds no
weight-stage bonus. All formulas execute in the pinned native calculators.

Each supported row reconstructs defense, offense, base BV, adjustment and rounded
total, and the probe independently checks the normal calculator's aggregates.
Structure includes gyro; defensive equipment includes armored components;
weapon BV is heat-adjusted and excludes arc ammo. Detail keys preserve weapon
location/type totals and available/capped ammo groups, plus capital arc ammo.
Neutral factors on zero pools are recorded as one (speed uses Java's factor).

Term mode compares required stages in calculation order, then every oracle
detail key in sorted order, reporting `firstTermDifference`. Missing or nonfinite
values fail, even when totals match. Existing MekStation breakdowns expose only
some terms; those omissions remain failures rather than inferred neutral values.
Aggregate mode remains available without the flag.

## Bounded full-corpus execution

`unit-bv-pipeline.ts` runs the same conversion, source validation, calculations
and strict report with 1–4 isolated family workers (default 2). Use one heavy
queue ticket for the whole command when measuring locally:

```text
node --require tsx/cjs scripts/unit-bv-pipeline.ts --mekfiles <mekfiles> --reference <oracle.jsonl> --out <scratch> --workers 2
```

The original two-command path above remains the fresh serial reference.
`strict-families.json` owns source-folder order for both paths. Family outputs
are concatenated in that order, independently of worker completion order.
Missing, failed and extra sources still reach the single strict comparator;
no family summary or worker exit can replace its full-corpus coverage gate.
The runner bounds command execution to a shared 13-minute deadline, closes
child stdin, propagates failures and waits for active family work to finish.

Add `--cache-dir <external-scratch-cache>` to reuse unchanged families. Keys
hash the complete source-file inventory and bytes for that family, all source
and script files, equipment/schema data, config, package manifests, TypeScript
config, the oracle, actual loaded Node dependency packages including binaries,
the Node executable/version/platform, Python executable and loaded Python
module/source-cache bytes, and the
environment (except operational `HEAVY_*` queue metadata). Additions, deletions
and renames change keys. Unreadable, linked or unknown filesystem inputs or
unavailable Python runtime identity disable reuse. Corrupt, incompatible or
mismatched cache entries run fresh; unavailable cache writes preserve the
fresh result. Source and computed artifacts have independent integrity hashes.
Binary artifacts retain nonfinite numbers and undefined fields for the strict
comparator's existing invalid-row diagnostics.
Computed payloads use deterministic JSON with escaped tags for those values,
negative zero and array holes; literal tag strings are escaped. V8's binary
encoding is used only for the disposable cache envelope, since equal values
can have different V8 encodings.

`--verify-hits N` recalculates the first N actual hits and compares both
artifacts byte for byte. A disagreement evicts that entry and fails the run.
`--uncached` disables reads and writes; main push and scheduled runs always
disable them even if a cache directory is supplied. Cache use never skips the
final strict report. `sources.ndjson`, `delta-report.json` and `delta-rows.jsonl`
retain the serial formats and deterministic bytes; `execution.json` separately
records worker and cache state.

In term mode each family also reports `termMatched` (joined rows with every
required stage and oracle detail matching) and `firstTermDifferences` (counts
by first failing key). These counts do not replace the aggregate gates. Rows
without a hash join never count as term matches. Aggregate mode retains its
existing summary shape.

The ProtoMech trace adapter maps `physicalWeaponBV` to `weightBV`, exposes
the documented inherited empty type stages, carries the existing chassis
summary factor and reports the final adjustment from the rounded base. It
does not invent native weapon, misc-equipment or ammo-group detail keys.

Term mode also retains the full ordered `termDifferences` array per row, with
all missing/nonfinite reference/local causes and numeric differences, so the
first error cannot hide later discrepancies. Per-family `termCoverage` counts
each required stage and normalized oracle detail: compared, matched,
missingReference, missingLocal, nonfiniteReference, nonfiniteLocal, different.
Both-side failures increment both cause counters; `different` counts only
finite numeric pairs outside tolerance. Only hash-joined rows are compared;
unjoined coverage remains visible in the existing joined/rows counts. Missing
figures are compared as missing local terms. Local-only breakdown aliases are
not oracle requirements. Aggregate mode retains its existing report shape,
and firstTermDifference, firstTermDifferences and all acceptance gates retain
their previous meaning. Missing quantities never become neutral values.
