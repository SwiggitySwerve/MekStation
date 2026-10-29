# Design decisions

## D1: One reproducible source denominator

The conversion package owns immutable source inventory. Read the supplied Git
commit's objects, independent of dirty working files; record repository identity,
resolved commit, relative path, format, Git blob and SHA-256. Include archives,
unknown formats and failures explicitly. Do not deduplicate by filename, slug or
MUL ID. Raw files, unique designs, loaded entities and compared units are separate
counts. The first slice inventories raw files; archive expansion and typed
metadata follow with their own evidence.

The upstream cross-check of 2026-10-28 pins
MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, MegaMekLab
`62bf19360382049e2e6a1e8f24e859e27bdc5878`, MekHQ
`e7adc2c6f3b17ec8ad243d30843e22207fe935e4` and mm-data
`50f7efef0c9f775b0258f8283525ed4f906e1985`. Preserve those research pins. Record
any justified compatible runtime tuple separately, with its dependency/build
evidence. Never silently substitute an unversioned historical BV export.

Primary source anchors: [parser and subtype dispatch](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/MekFileParser.java#L221), [BLK engine codes](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKFile.java#L80), [MML status calculations](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/ui/generalUnit/StatusBar.java#L156).

## D2: Source facts, loaded facts and calculated results

Extend `unit-entity-model`, existing serialized types and type handlers. Keep
raw source provenance separate from the normalized domain entity. Preserve
engine flags, technology/rules/year, armor/BAR and orientation, original SI/fuel,
mount multiplicity, Omni/rear/size/shot/bay facts, transports and native location
topology. Unknown values produce structured diagnostics; defaulting an unknown
engine to fusion or a support aircraft to a conventional fighter is forbidden.

Existing `unit-services` owns browser/Node discovery and custom persistence.
Both paths consume the same validated domain contract. Zustand adapters hydrate
that contract; views display domain calculations. Round trips compare semantic
facts, not textual formatting. Design identity remains distinct from campaign
instance identity and damage.

## D3: Compatible runtime reference

MegaMek is the loaded-entity and numerical authority used by MegaMekLab. Export
its concrete class/subtype, locations, resolved mounts, original construction
fields, verifier identity/options/results, BV components and final figures.
Capture runtime versions, artifacts/hashes, command, pins, source digest,
equipment resolution failures and calculation options. Match crew skills,
design damage state, C3/network context and manual overrides explicitly. MekHQ
is a consumer cross-check, not an independent construction implementation.

Reference extraction must distinguish parser failure, unresolved equipment,
invalid construction and supported calculation. An upstream-invalid design is
still a loadable design and must remain representable with diagnostics. If a
metric truly does not apply (for example a BFS card without construction weight),
record the upstream-supported reason. Unsupported local behavior is a gap.

## D4: Strict comparison and readiness

For every applicable finite numeric reference `r != 0`, require
`abs(actual - r) / abs(r) < 0.01`, without pre-rounding. For `r == 0`, require
exact zero. Missing, nonfinite, mismatched-option or stale-reference results fail.
Compare all exposed quantities and available weight/BV component terms, so
errors cannot cancel into a passing total. Exact comparisons govern integer
counts, identifiers, location orientation, equipment and construction semantics.
Existing broader mech BV gates remain regression protection; their success
alone does not satisfy this goal.

The coverage ledger tracks every source row through discovery, upstream load,
local load, semantic comparison, construction validation, numerical comparison
and save/reload. A successful inventory command is not a parity pass. A family
is data-ready only with nonempty references, complete source accounting, no
unexplained local load/resolution gaps, all applicable strict comparisons, and
passing semantic persistence checks. UI expansion begins after this data work;
no unsupported editor silently falls back to a mech.

## D5: Construction families and delivery order

1. Complete the source denominator and reproducible reference harness.
2. Repair import semantics and the approved vehicle figures: installed engine
   shielding/rounding/minima; suspension across conversion/store/domain; controls,
   lift/dive and sinks; flank rounding; turret armor and sheet identity; real
   turret mechanism/Omni allowance rules. Tamerlane requires engine, lift and
   controls together. Boreas Prime is fuel-cell support, not an ICE combat tank.
3. Extend family rules and typed loaders: all mech configurations, combat
   vehicles/VTOL, support including fixed-wing/large support, fighters, small
   craft/DropShips, capitals, battle armor, infantry, ProtoMeks, emplacements,
   buildings, handheld weapons and BFS. Use the loaded upstream entity to
   resolve additional subtypes; this list cannot hide newly found families.
4. Prove catalog/local-import and save/reload paths; prepare publication impact.
5. Correct forms, skeletons, armor diagrams, status displays and sheets, with
   load/edit/save/reopen/print acceptance flows for each subtype.

Subsequent small PRs add focused deltas to the existing per-family specs when
their current rules conflict with verified sources. Each implementation slice
names its consumers and tests before changing them.

## D6: UI acceptance

Keep the main customizer and reusable controls. Map each subtype to the correct
fields, valid choices, location geometry, equipment placement and sheet. Include
distinct rotors/turrets, superheavy facings, aerodyne/spheroid arcs, support tech
ratings and capital transport/drive fields where applicable. Loading skeletons
must retain the intended family structure without displaying placeholder rules
values. Compare structure and behavior with the pinned MegaMekLab editor; do not
use a percentage of screenshot similarity as a correctness claim. Verify narrow
and wide layouts, keyboard operation, errors, long labels and reload persistence.

## D7: A modern portable contract

The owner's modernization direction requires an application-independent design
document, documented and validated through the existing schema authority. Define
its schema/version identifier, stable design/equipment/location identities,
explicit measurement units, discriminated construction families, relationships,
extension policy and deterministic serialization. Keep source provenance,
calculated results (with rule/runtime identity) and campaign-instance state
distinct. Consumers must not need MegaMek enum ordinals, source path conventions
or UI-store implementation details to interpret the document.

MTF, BLK and BFS remain import/export adapters with source-conformance fixtures.
Extend and consolidate current schema/type generation rather than adding a
second schema owner. Publish machine-readable schemas, examples, migration and
compatibility rules and an executable conformance suite. Demonstrate use by an
independent minimal consumer before claiming portability; describe it as a
proposed interchange contract, not an already adopted external standard.

## Delivery evidence

Keep commands, source pins, baseline failures, passing checks, counted coverage
and unresolved gaps with each slice. No goal/task completion based on discovery,
an expected-failing test, a mocked total or a deferred validation exit. Review
each exact PR head with Opus and GPT Sol; merge only green, reviewed changes.
