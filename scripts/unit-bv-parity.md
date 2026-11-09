# Pinned-source BV comparison

`unit-bv-parity.ts` owns comparison rules for all seven families;
`vehicle-aero-bv-delta.ts` converts inputs and writes reports.
The oracle remains outside the repository. From the repository root:

```text
python -B scripts/megameklab-conversion/export_vehicle_aero_json.py <mekfiles> <scratch> --strict
node node_modules/tsx/dist/cli.mjs scripts/vehicle-aero-bv-delta.ts --converted <scratch>/sources.ndjson --mekfiles <mekfiles> --reference <reference-full.jsonl> --reference-trust blocking --reference-policy config/reference-policy/expected-reference-policy.json --out <report-dir>
```

For proof, `<reference-full.jsonl>` must be the accepted P1 `run-1/full.jsonl`
with SHA-256
`4e19c56b957de2a8fc70dbfd131e76b64caa05adf8ba145b1610cc6b3ec37d87`,
or a byte-identical retained copy. The original is under
`E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/normal-work/P1-reference/`.
The accepted proof copy is `expected-policy/default-correction/proof-d0c8c9e74/reference-full.jsonl`
under that same report root, with its adjacent
`reference-full.jsonl.provenance.json`. Supply the independently derived actual
sidecar at `<reference-full.jsonl>.provenance.json`; it binds retained native
runtime/build/config/invocation evidence to the exact reference bytes. Do not
derive it from the expected policy.

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

Both external comparison entrypoints audit `--reference-policy` and a separate
`<reference-full.jsonl>.provenance.json` actual-evidence sidecar before numerical work.
The expected policy must be approved independently of the supplied reference.
The Zod/code default stays **report-only**, available for diagnostics only:
missing evidence and other trust violations are recorded and printed without
changing the numerical result. The trust report still has `ok:false` when
violations exist;
a green BV result is not trust acceptance. There is no default policy,
expectation discovery, or command to bless saved output. Conversion receipts
do not establish oracle runtime/settings.

Proofs must use `--reference-trust blocking --reference-policy config/reference-policy/expected-reference-policy.json`,
as shown above, to reject violations before numerical work (pipeline API
`referenceTrust: 'blocking'`). No CI job runs this comparator: blocking is
enforced by the documented proof command, not by CI or the code default.
Enforcement never activates from policy presence.
`--reference-trust report-only` explicitly names the default. These are the only
modes; there is no other legacy bypass. Source hashes, conversion receipts and
numerical failures remain enforced in both modes. Report-only diagnostics do
not replace the required blocking proof command. Any policy or pin change must
regenerate the policy in the same PR using the independently pinned inputs and
the [policy generator instructions](../config/reference-policy/README.md).

Both version-1 JSON documents contain `runtime`, `crew`, `network` and
`bvOverrides`. Runtime records `megamekCommit`, `megameklabCommit`, `mmDataCommit`
(40-character Git hashes), `javaVersion`, and SHA-256 fields
`dependencyManifestSha256`, `compiledRuntimeManifestSha256`, `exporterSha256`,
`verifierConfigSha256`. Additional named runtime entries are retained and must
also match. Crew, network and overrides are nonempty maps of explicitly recorded
scalar settings; extra or absent fields are violations. For the accepted
P1 invocation the documented declarations describe freshly loaded default crew,
no attached game/network, and no campaign/editor/custom-option mutations. These
are recorded evidence declarations, not new typed crew/network instrumentation.
The native runtime/exporter manifests and consumed verifier-config receipt supply
actual artifact identities; the expectation is the separately approved runtime
and requested configuration, never a copy learned at comparison time.

The actual sidecar additionally records `referenceSha256`, binding its evidence
to the exact JSONL bytes. The expected policy additionally records
`battleValueMode` and `verifierSettings`, a map from each source path to its exact
expected scalar verifier-settings map. Every row must record matching
`battleValue.mode` and `construction.settings`. Source-dependent settings such as
`gameYear` and `ammoTechLevel` require their own approved expected values; there
is no inferred global fallback. Missing/malformed evidence, extra settings,
unlisted reference paths and absent expected paths are violations. Blocking
mode fails closed on all of them.

`reference-provenance-report.json` records the reference, actual-sidecar and
expected-policy hashes, effective mode, and named expected/actual mismatches.
Violations are also printed to stderr. Blocking rejection stops before source
calculation, cache work, or numerical report publication. Accepted
trust leaves the existing source-hash, completeness, numeric and construction
checks intact; it is not a parity result. Existing native exports can be used
with their retained provenance and an approved policy without Java re-execution.
[The accepted #2958 proof](https://github.com/SwiggitySwerve/MekStation/pull/2958#issuecomment-6694990810)
audited the independently approved full policy against the reference above:
`trust.ok === true`, **0 violations**, **9,815 sources in scope**. That audit
ran in report-only mode and independently asserted those trust results;
subsequent proofs must use the blocking command documented here. Fixed
independent tests cover both modes. Trust acceptance does not establish full
numerical or per-term parity.
Actual manifests and native output must not be promoted into expectations.
Independently undocumented values may be recorded as explicit `null` in a
proposed policy, with their explanation in the policy owner's companion
evidence. Null is not an accepted setting value: even paired actual/expected
nulls fail validation. Omitted required fields, empty evidence maps and missing
per-source expectations are violations too; blocking mode rejects all of them.
No unspecified value becomes
a neutral default or passing comparison. Record non-consumed context such as
MekHQ's pin separately; this loaded-reference runtime does not establish MekHQ
compatibility.

Artifact meanings are fixed: `dependencyManifestSha256` and
`compiledRuntimeManifestSha256` hash the exact consumed runtime's
`runtime-dependencies.json` and `compiled-runtime-files.json` bytes.
`exporterSha256` hashes the exact consumed `VehicleAeroReferenceExporter.java`
source bytes, not the Python entrypoint or a combined receipt. Record Python,
construction-probe, stage-generator and other independently relevant identities
as additional named runtime entries; they are compared without dropping extras.
`verifierConfigSha256` hashes the exact consumed XML bytes; CRLF-normalized
similarity never substitutes for that digest. `javaVersion` is the complete
recorded `java --version` output with CRLF converted to LF and outer whitespace
trimmed when evidence is captured, not the short toolchain label. Comparison
does not normalize these runtime strings or hashes.

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
node --require tsx/cjs scripts/unit-bv-pipeline.ts --mekfiles <mekfiles> --reference <reference-full.jsonl> --reference-trust blocking --reference-policy config/reference-policy/expected-reference-policy.json --out <scratch> --workers 2
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

## Opt-in source-handler validity

Add `--construction-validity` to the guarded serial comparator with a P1
`--construction-terms` reference. The same source calculation writes separate
`construction-validity-report.json` and `construction-validity-rows.jsonl`.
It compares actual BA, infantry, ProtoMech, vehicle, aerospace and capital
handler validation results, including invalid designs and diagnostics. Vehicle,
aerospace and capital validity use the same pinned Buffer already read and
hash-checked by `calculateSources`, parsed through the public BLK parser,
initialized registry and the handler it selects. They never reconstruct
validation input from converted BV JSON. `FixedWingSupport` under `vehicles/`
validates through the aerospace handler, and a folder name never supplies
classification. Aerospace and capital cover fighters, conventional fighters,
FixedWingSupport, SmallCraft, DropShips, JumpShips, WarShips and space stations.
Existing BA/infantry/ProtoMech facts remain intact. Parser/handler failures and
validator exceptions remain explicit staged failure facts, named `blk-source-parser`,
`blk-handler-unavailable`, `blk-handler-parser` and `blk-validator`.
BattleMech MTF has no source handler, so its validity is the editor projection
the app itself runs: the row's converted `unit` goes through
`UnitLoaderService.mapToUnitState`, the editor's `useUnitCalculations` (rendered
once on the server build of `react-dom`), the editor's slot, armor and weight
helpers, and the validation orchestrator. The orchestrator's rule results are
flattened to `ruleId: message` strings under errors, warnings and infos, so the
fact has the same shape as a handler result and `isValid` is the orchestrator's.
The MTF bytes are only hash-checked by `calculateSources`; validity does not
reparse them, and it is computed even when the BV path could not use the
converted unit. Its staged failures are `mtf-converted-unit`, `mtf-load`,
`mtf-projection` and `mtf-validator`. Successful parsing
with `isValid:false` retains invalidity and all returned errors/warnings/infos.
Registry/validation work runs only with the opt-in flag. Under the flag the CLI
first loads the JSON equipment catalog, because weight validity resolves
mounted mass through it: without the catalog Ajax Assault Tank C, Lightning
Attack Hovercraft CX-3 and SturmFeur Kalki read as valid instead of overweight.
A fallback to the hardcoded catalog stops the run rather than changing results.
Other local-family projections,
weight terms/totals, verifier quantities and settings remain explicit gaps;
reference weight maps marked unsupported retain their reasons; infantry's
decomposition is applicable but not instrumented. `ok` is scoped to
validity only; aggregate BV success does not fill missing comparisons. Either
selected report failing keeps the CLI exit nonzero. Without the flag all
existing BV report bytes and calculation paths retain their previous contract.
Runtime/BV mode/settings mismatches use the independent policy/actual-evidence
boundary and explicit enforcement mode above. This does not compare local
construction weights or instrument previously absent crew/network facts.

This vehicle slice does not fix domain mismatches. Its proof records the actual
integrated validator/input head, including any landed source changes. If P3's
`#2870` modernization remains draft at that proof, complete row 3.4 acceptance
still needs a later comparison including its final merged validators. Historical
failed proofs are not waived. Exact BV, successful loading and report presence
do not establish validity, weight, quantities, settings or complete row 3.4.
