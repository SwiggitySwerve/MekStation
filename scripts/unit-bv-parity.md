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

Add `--construction-validity` to the guarded serial comparator, with the P1
`--reference` file (an exporter run made with the Java exporter's
`--construction-terms`; the comparator has no such flag). The same source calculation writes separate
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
weight terms/totals (compared only under `--construction-weights`, below),
verifier quantities and settings remain explicit gaps here;
reference weight maps marked unsupported retain their reasons; infantry's
decomposition is applicable but not instrumented. `ok` is scoped to
validity only; aggregate BV success does not fill missing comparisons. Either
selected report failing keeps the CLI exit nonzero. Without the flag all
existing BV report bytes and calculation paths retain their previous contract.
Runtime/BV mode/settings mismatches use the independent policy/actual-evidence
boundary and explicit enforcement mode above. Validity mode does not compare
local construction weights or instrument previously absent crew/network facts.

This vehicle slice does not fix domain mismatches. Its proof records the actual
integrated validator/input head, including any landed source changes. If P3's
`#2870` modernization remains draft at that proof, complete row 3.4 acceptance
still needs a later comparison including its final merged validators. Historical
failed proofs are not waived. Exact BV, successful loading and report presence
do not establish validity, weight, quantities, settings or complete row 3.4.

## Opt-in construction weight terms

`--construction-weights` (row 3.4 W1) compares MekStation's construction
weight terms with the pinned-Java additive maps in the same P1 `--reference`
(`construction.weightTerms` and `weightTotal`, tons, keyed by native method
name; BattleArmor keeps `trooper.<index>.<method>`). It runs next to, and
independent of, `--construction-validity` (either flag loads the JSON equipment
catalog first) and writes `construction-weight-report.json` and
`construction-weight-rows.jsonl`. Without the flag every existing report, and
every row's other fields, keep their previous bytes; the flag only adds the
local `constructionWeights` fact to each computed row. Either selected report
failing keeps the CLI exit nonzero. It is measurement only: a disagreement or a
missing local term is a finding for a later PR, never fixed here. Verifier
quantities and settings are the separate W3 comparison.

Rule per Java term (the reference's key set is the requirement list):
`exact` when the difference is within the Java exporter's own tolerance
(1e-9 t absolute, 1e-12 relative); `within1Pct` when it is strictly less than
1% of the Java term; otherwise `different`. A zero Java term needs a zero local
value. A term MekStation cannot produce is `missing-local`; a nonfinite local
value is `nonfinite-local`; a captured local exception is `failed-local`. All
of these fail the row, so a gap is never a pass. A local-only term is listed
under `localOnly` and is informational. `getWeightAllocatedArmor` (patchwork)
is compared against the local armor term.

Local terms come only from construction owners that already exist and are never
fabricated; whatever a family cannot produce is absent, with the reason kept on
the row (`unavailable`):

- BattleMech (MTF): the editor projection (`useUnitCalculations`, shared with
  validity). Engine, structure, controls (cockpit + gyro), heat sinks, armor
  and LAM/QuadVee conversion (`getWeightMisc`) map one-to-one. Jump jets are
  MiscType in Java, so they join the equipment lump below.
- Tank and SuperHeavyTank (BLK, `VehicleUnitHandler`): the native
  `computeNativeTankWeight` breakdown. Engine, structure, controls, heat sinks,
  armor, power amplifiers and carrying space map one-to-one; `getWeightMisc` is
  turret + secondary turret + lift; total is tonnage minus remaining.
- Everything else (VTOL, support vehicles, BattleArmor, ProtoMech, infantry,
  aerospace, capital) has no additive local weight seam on main. BattleArmor's
  `computeTrooperMass` takes editor-model mounts with `massKg` that no
  BLK-source adapter builds; `aerospaceSourceWeight` is a mass bound. Their
  terms report as `missing-local` and feed the follow-up seam lanes.

Where the local code has only one figure for what Java splits, the report
compares a declared group against the sum of the Java members present in that
row (`mountedEquipment`: MiscEquip + Weapon + Ammo + the family's remaining
members), marks the members `grouped:mountedEquipment`, and the group carries the
verdict. No catalog-category classifier decides the split.

Infantry's Java map is `unsupported`, so those rows fail as
`reference-unsupported` and are listed under `pendingInputs`. The mode accepts
the second reference input for them, `--weight-terms-extra <rows.jsonl>`: rows
of `{path, sha256, construction: {weightTerms, weightTotal, reconstruction:
{ok: true}}}` joined on path plus SHA-256, accepted only for rows whose primary
map is unsupported and rejected (`extra-duplicate`, `extra-unknown`,
`extra-hash-mismatch`, `extra-overlap`, `extra-rejected`) otherwise. Its hash is
recorded as `extraInputSha256` beside `referenceSha256`.

The report carries `byFamily` (row verdict counts plus term counts) and
`byComponent` (family, then Java key with the trooper index collapsed to `*`,
plus `weightTotal` and group names; each with exact/within1Pct/different/missing
counts and the maximum absolute and relative difference), and each row lists
every term with Java and local values, delta and relative percent.

## Opt-in verifier quantities and settings

`--construction-quantities` (row 3.4 W3) compares the five finite verifier
quantities and the 24 construction settings the pinned Java exporter writes per
row (`construction.verifierQuantities`, `construction.settings`, in the same P1
`--reference` file) with MekStation's own owners. It runs next to, and
independent of, `--construction-validity` and `--construction-weights` (any of
the three loads the JSON equipment catalog first) and writes
`construction-quantity-report.json` and `construction-quantity-rows.jsonl`.
Without the flag every existing report, and every row's other fields, keep their
previous bytes; the flag only adds the local `constructionQuantities` fact. When
`--construction-weights` also runs, one weight capture feeds both comparators.
Either selected report failing keeps the CLI exit nonzero. It is measurement
only: a disagreement or a missing local value is a finding for a later PR.

### Quantities (per row)

`weightExact` (`calculateWeightExact`, t), `weightRounded` (`calculateWeight`, t),
`weightDesign` (`getWeight`, t), `armorPoints` (`getTotalOArmor`, points) and
`criticalSlots` (`totalCritSlotCount`, slots). The rule is W1's: exact within
1e-9 absolute or 1e-12 relative, `within1Pct` only when strictly less than 1% of
the Java quantity, otherwise `different`; a zero Java quantity needs a zero local
one. A quantity MekStation cannot produce is `missing-local` with its reason, a
nonfinite one `nonfinite-local`, a captured exception `failed-local`; all fail
the row. A Java quantity that is absent, has the wrong unit, is nonfinite or
carries an exporter `status` is `reference-invalid`, never a zero.

Local sources, all existing owners:

- `weightExact`: the W1 total (BattleMech editor projection, Tank native weight).
- `weightDesign`: the editor state tonnage (BattleMech) or the handler unit
  tonnage (BLK families with a handler).
- `armorPoints`: `getTotalAllocatedArmor` over the editor allocation
  (BattleMech) or the handler `totalArmorPoints` (vehicle, aerospace, capital).
- `criticalSlots`: the sum of `getLocationSlotCount` over the configuration's
  locations (BattleMech only).
- `weightRounded`: no local owner. The validators compare the unrounded sum
  (`WeightOverflowValidation.ts:54`, `AbstractUnitTypeHandler.ts:353`), and
  `ceilToHalfTon` exists per component only; the script never derives it.
- BattleArmor, infantry and ProtoMech handlers expose none of the five.

### Settings (per cell)

The 22 `TestEntityOption` getters (plus `gameYear`) are constants of the
verifier class, not facts of a unit, so they are compared once per
(family, verifierClass) cell, not per row. `ammoTechLevel` varies per unit and
stays per row: it is `missing-local` on every row because no local owner exports
the Java compound tech-level integer (VAL-BM-012 compares `rulesLevel` enums).
`gameYear` is a cell constant until a row differs; then each row of the cell is
a finding.

Each cell result is `matched`, `different`, `missing-local` (with the reason) or
`inapplicable-candidate`. A candidate is an option no Java call site reads for
that verifier class, or one gated off by another pinned option; its Java file:line
evidence is on the result. **Nothing is excluded**: candidates still fail the
report until the owner accepts them (design D3), and they are listed under
`settings.inapplicableCandidates` for that decision.

Local values come from existing owners and are never invented:

- Weight ceilings: a sentinel probe of the owner (the real rounding function is
  called with a discriminating input such as 0.3 t and the observed step is
  compared with the Java `Ceil`). An owner whose output cannot show the step
  (the gyro) or that does not exist is `missing-local`.
- `getIntroYearMargin`: `INTRO_YEAR_MARGIN`, only for the families whose
  intro-year check uses it (vehicle, aerospace).
- `getMaxOverweight` and `showOverweightedEntity`: each row's capture runs the
  real overweight rule (VAL-UNIV-014 for BattleMechs, the handler's common
  validation for BLK families) at 0, 0.1, 0.25 and 0.3 t over, and the cell uses
  the observed tolerance. Local tolerance is 0 where a check exists; Java is 0.25
  for aerospace, capital, BattleArmor and infantry, which is a measured
  `different` gap, not a validator change. The result carries a count of corpus
  rows lying in the (0, max] t band (Java exact and rounded weight over design
  weight); on the pinned corpus that count is 0 for every class.
- `showUnderweightEntity` and `skip` are `missing-local` with "no local owner;
  absence cannot be cited": a rule that is absent has no file:line to cite.

A drift guard fails the report when the reference's settings key set is not the
pinned 24, a value changes type, an option differs between rows of one cell, a
verifier class is not in the pinned classification, or a quantity key is not one
of the five.

`--weight-terms-extra <rows.jsonl>` (the W2 additive infantry export) is also
accepted here. Its rows carry the same pinned-Java quantities, so they are
cross-checked against the primary reference on path plus SHA-256 and any
disagreement is drift (`extra-quantity-mismatch`, `extra-unknown`,
`extra-hash-mismatch`, `extra-duplicate`, `extra-rejected`); they supply nothing
the primary lacks.

The report carries `byFamily` (row verdict counts), `byQuantity` (family, then
quantity, with exact/within1Pct/different/missing counts and the maximum
absolute and relative difference), `settings` (`cells`, `counts`,
`inapplicableCandidates`, `perRow`) and `drift`.

## Accepted D3 settings exclusions (2026-11-09)

PARITY-PLAN §17 accepts exactly the 157 `(family, verifierClass, key)` cells
recorded in `scripts/unit-construction-settings-acceptance.json`: 146 unused or
report-only cells and 11 suppressed by pinned options. The JSON preserves the
verbatim ruling, source-report digest, reference digest and sidecar digest.
It is separate from `config/reference-policy/`; that policy is unchanged.

The acceptance applies only to MegaMek
`48fcb2f64a1b3f2d575707ce5653dad64927b587` and verifier configuration
`6da4950889506c309776d933b4af757e582f97a6accd5f2095596d2f3cf76533`.
Both identities come from `runtime` in the reference's adjacent
`reference-full.jsonl.provenance.json`. The trusted-reference reader supplies
them only after validating the sidecar against the actual reference bytes and
the independent policy; its existing array-return callers remain supported.
A missing, mismatched or untrusted identity authorizes no exclusions.

To reproduce or check the reviewed data, supply the original W3 proof report,
the reference sidecar and PARITY-PLAN:

```text
node scripts/derive-construction-settings-acceptance.mjs --report <parity-W3/proof-rev/head/construction-quantity-report.json> --sidecar <reference-full.jsonl.provenance.json> --plan <PARITY-PLAN.md> --check
```

The derivation requires exactly 157 distinct triples. Check mode compares the
entire regenerated document with the committed JSON and fails on any change.
Omit `--check` only when deliberately preparing reviewed acceptance data.

Listed cells that remain inapplicable under the current consumer classification
receive terminal status `accepted-inapplicable`, with a separate count. They
produce no `settings-inapplicable-candidate` error and never count as matched.
If a listed cell becomes consumed (including an enabled formerly suppressed
gate), `accepted-inapplicable-consumer-drift` fails the report even if its local
value matches. An unlisted triple remains outside the acceptance.

The census settings counts become 24 matched / 4 different / 68 missing-local /
0 inapplicable-candidate / 157 accepted-inapplicable. The four differences,
68 missing-local settings, per-row settings and all missing quantities remain
findings. This acceptance does not close row 3.4 or change BV, validity, weight,
source loading, catalog data or persistence.

## Support-vehicle weight capture (G1)

W1 also captures SupportTank, LargeSupportTank and SupportVTOL sources through
`SupportVehicleUnitHandler` and `computeSupportVehicleWeight`. It passes
`createSupportRegistryMass(unit.techBase)`, exactly as the handler does, so raw
BLK launcher names use the same registry masses. Combat VTOL remains unavailable.

The adapter copies the owner's typed engine, structure, controls, heat sinks,
armor, misc, misc equipment, weapons, ammo, power amplifiers, carrying space and
fuel fields to the Java additive keys. Support fuel maps to `getFuelTonnage`.
The total is the owner's `total`; no nominal weight or reference value supplies
an absent result. Numeric-field coverage is checked against the public output,
without making added owner fields a compile-time incompatibility.

`getArmoredComponentWeight` has no typed support output. It stays absent and
`missing-local`, with its reason in `local.gaps`, even when Java reports zero.
The owner's `unresolved` inputs are retained verbatim in `local.unresolved`;
the adapter does not interpret diagnostic names. Capturing these terms does not
establish complete support weight parity: rows remain incomplete or different.
