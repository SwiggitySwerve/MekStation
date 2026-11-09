# Execution ledger

The owner has authorized implementation. The latest all-family, data-first goal
supersedes the assessment pause. Each row needs actual evidence before closure;
small implementation PRs can discharge parts of a row without closing the rest.

Reconciled on main `1ddeb94f4` (2026-11-01). A slice row is ticked when its own
text is met; the gaps it names as remaining belong to the umbrella rows. `Proof:`
evidence paths are relative to the shared `MekStation-wt/_reports/` folder, and
`ledger/` means `2026-10-30/claude-coordinator/ledger/`, which holds the re-runs
on that commit. A second pass on main `15d1ced4f` (2026-11-02; first measured at `970be23d1`) ticked row 1.2,
rewrote the `Open:` clauses to current figures, and re-measured the figures in
`ledger/tick2/`. A third pass on main `1a55688be` (2026-11-02) ticked no row,
rewrote the `Open:` clauses again and re-measured the figures once in
`ledger/tick3/`. A fourth pass on main `4678ec34f` (2026-11-03) ticked rows
1.4, 2.4, 3.0 and 3.5, rewrote the `Open:` clauses and re-measured the figures
once in `ledger/tick4/`. Row 3.0 was proven on the merged tree at `86790ec24`,
because #2614 merged after the fixed SHA. A fifth pass on main `a561ee53a`
(2026-11-04) ticked row 3.3 (capital ships are read-only by the owner's tick-4
ruling), rewrote the `Open:` clauses and re-measured the figures once in
`ledger/tick5/`. Row 5.1 was amended by #2648. A sixth pass on main `ac64a3330` (2026-11-05) ticked no
row, rewrote the `Open:` clauses and re-measured the figures once in
`ledger/tick6/`. Row 5.1's back-fill, subset reviews and review fixes are done and
its `Open:` clause says what is left. The last review fix, #2700, merged after the
measured SHA (as `096cc20d7`); it is not measured here.

Acceptance reconciliation on main `0b8ea746c6` (2026-11-06): 34 of 45
top-level rows are ticked; the two completed subrows make 36 of 47 checkbox
entries. The 11 open rows remain 1.3, 2.1, 2.2, 2.3, 2.22, 3.1, 3.2, 3.4,
4.1, 4.3 and 5.2. Earlier numerical and failure counts in the row clauses
are dated measurements, not assertions about this main revision. The accepted
Phase G release (`phase-g/PHASE-G-COMPLETE.md`) supersedes the stale pause and
7.2-minute release gate; it does not complete these rows.

The later guarded G5 proof measured clean main `3502cf6c8`, not this revision:
9,815 distinct sources loaded and joined, with exact total/aggregate BV across
all seven families. Its detailed audit exited 1: 4,130 rows had no first-term
difference, 5,667 had a missing-side first difference and 18 had a numeric
first difference (5,685 diagnostics). These are historical results, not a new
BV run or complete construction/editor/gameplay parity. Proof and retained
artifacts: `phase-g/G5/current-main/PROOF.md`. Reconciliation, the 115-item
inventory, dependency map and artifact-hash audit:
`normal-work/P8-acceptance/`. No checkbox changes in this reconciliation.

Row 1.3 export acceptance on main `36f41d2ca` (2026-11-06) follows the slice
rule above: its literal export obligation only is complete, with the linked
comparison-rejection scenario still incomplete. This brings the ledger to
35 of 45 top-level rows ticked (37 of 47 checkbox entries); 10 rows remain open:
2.1, 2.2, 2.3, 2.22, 3.1, 3.2, 3.4, 4.1, 4.3 and 5.2. The earlier census is
historical. No full requirement, numerical parity, spec sync or archive is
accepted by this tick; row 1.3 and row 3.4 retain the exact missing work below.

Row 3.3 was reopened on 2026-11-09 (see row 3.3). This brings the ledger to 34
of 45 top-level rows ticked (36 of 47 checkbox entries); 11 rows remain open:
2.1, 2.2, 2.3, 2.22, 3.1, 3.2, 3.3, 3.4, 4.1, 4.3 and 5.2.

## 1. Source and reference foundation

- [x] 1.1 Implement deterministic pinned Git source inventory in `scripts/megameklab-conversion/`, including MTF/BLK/BFS, hashes, explicit other files and nonempty input errors. Test dirty-tree isolation and missing/invalid inputs. (`unit-services`: Immutable source inventory) Proof: #2373; tests: `scripts/__tests__/test_source_inventory.py` (9 pass); evidence: `2026-10-28/upstream-crosscheck/implementation/runtime-reference/corpus/source-verification.json` (10,994 sources: 4,263 MTF, 6,725 BLK, 6 BFS, plus 4 explicit non-source entries), `ledger/slice-tests/py-source-inventory.log`.
- [x] 1.2 Extend the inventory with upstream-loaded family/configuration identities, archive members, load failures and separate unique-design counts. Reconcile every source entry without silent deduplication. (`mtf-parity-validation`: Complete source accounting) Proof: #2512; tests: `scripts/__tests__/test_source_inventory.py`, `test_source_reconciliation.py` (27 pass on main `970be23d1`); evidence: `2026-10-30/claude-coordinator/unit-loading/L-INV2/` (10,994 source entries against the 9,815-row UL-16b oracle: 9,815 loaded, 0 failed, 1,173 excluded, 6 BFS pending, 0 archive members, 9,815 unique designs; the older corpus's 239 duplicate groups reproduced exactly), `ledger/tick2/reconciliation-1.json` and `reconciliation-2.json` (re-run on main, byte-identical, SHA-256 `1736f23f6ffb1b9d105ec7c9c6cf87da43ff598d5ab3e4983fb95e00ed395692`), `ledger/tick2/py-source-inventory.log`. The 6 BFS files are recorded as pending, not dropped; whether to support them is an owner question that row 3.2 and check 2 carry.
- [x] 1.3 Establish a compatible pinned MegaMek/MegaMekLab runtime and export loaded entities, verifier/BV terms and settings. Record reproducible commands/artifact hashes and source resolution errors. (`mtf-parity-validation`: Reproducible loaded-entity references)
  - Proof (literal export obligation only): #2434, #2503, #2573 and #2584
    established the compatible pinned runtime and all-family native BV exports;
    #2919 merged as `974cb7b993fba5761454ed4dbce292d22a605fa9` from accepted
    proof head `08460ddb96c3068295546d97bdf5af2d1f0d8376`. Two byte-identical
    exports retain 9,815 distinct loaded rows, 22 concrete classes, all seven
    families' BV term maps, five finite verifier quantities and recorded
    settings on every row, with zero load/stage failures or source drift.
    Six-family additive maps reconstruct on 7,995 rows. Commands, runtime
    compatibility, settings, source errors and artifact hashes are mapped in
    [P1's exact-clause evidence](E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/normal-work/P1-reference/ROW-1.3-EVIDENCE-MAPPING.md),
    mapping SHA-256 `294b23b9b87bb037b54f9c9e5628c9b308f02ecf47c869c2bc929ceefb8061a1`;
    its `ROW-1.3-LIVE-CLAUSE.md` and `ROW-1.3-EVIDENCE-AUDIT.json` preserve
    the exact requirement and accepted artifact identities. P8's decision and
    22-file hash audit: `normal-work/P8-acceptance/row13-acceptance/`.
    No exporter or comparator was re-run for this ledger decision; the proof
    head, integrated ancestor, merge and later requirement-read head stay distinct.
  - Provenance prerequisites carried into row 3.4 are now met by merged
    #2955 (named runtime/crew/network/BV-mode/verifier-settings rejection and
    negative tests) plus #2958's independently sourced, Root-approved policy
    and accepted full-cohort proof. At execution `d0c8c9e7449ac6e34b530060bad12e09e29074cc`
    on base `7a37f29e15bbd450ce9ad287a28e76baf61b6ff7`, trust.ok is true with
    0 violations and all 9,815 units in scope. Totals are exact, aggregates
    within tolerance; the detailed census remains 4,224 / 5,591 / 109,956
    (matched rows / diagnostic rows / missing-local terms), not complete parity.
    Policy merge `6621e87bf44c421fcf0420a8ea1631a129f06bee` is separate from
    that execution. [Accepted proof](https://github.com/SwiggitySwerve/MekStation/pull/2958#issuecomment-6694990810);
    receipts: `normal-work/P1-reference/expected-policy/default-correction/`.
    Blocking remains off (report-only default), and CI is unchanged. This
    narrows only the fulfilled provenance prerequisite; no checkbox changes,
    complete construction/figure coverage or automatic CI enforcement is claimed.
  - Carried construction coverage: all 1,820 infantry additive weight maps are
    applicable but not instrumented, not genuinely inapplicable and never
    successful reconstructions. Native totals, five verifier quantities,
    validity/diagnostics, settings and BV terms remain exported. An audited
    infantry weight probe/reconstruction remains needed for complete component
    coverage under row 3.4; exhaustive decomposition is not stated in this
    literal export row. Older tick-6 export-gap wording is superseded at this scope.
- [x] 1.4 Implement strict per-term comparison, zero/nonfinite/1%-boundary rejection and coverage failure tests; retain existing mech regression gates. (`battle-value-system`: Strict all-family numerical parity) Proof: #2514, #2533, #2540 (the strict comparator over all seven families), #2573 and #2584 (`--per-term` against audited Java stage traces); tests: `scripts/__tests__/unit-bv-strict.test.ts`, `scripts/__tests__/unit-bv-terms.test.ts` (both pass in the full unit run on main `4678ec34f`, `ledger/tick4/full-jest.json`); evidence: `ledger/tick4/run-per-term-trace-1/` and `run-per-term-trace-2/` (byte-identical, report SHA-256 `22ee8a60f70235d5d5d7589e036c19ad28640c0382d372e749caf08538919c25`, `ledger/tick4/per-term-trace-hashes.txt`), `unit-loading/L-ORC2/`, `unit-loading/L-ORC2b/`.
  - Carried: the comparison is implemented and fails closed; it does not show per-term parity. The per-term adapters for all seven families (#2649, #2656, #2657, #2662, #2667 to #2670) are on main `ac64a3330`. Against the trace-bearing Java reference, two byte-identical runs (report SHA-256 `07685427…15301`, `ledger/tick6/per-term-trace-hashes.txt`) show that only 264 of the 9,815 rows match every term (BattleMechs 70, vehicles 159, aerospace 35; no battle armor, infantry, ProtoMech or capital row). The other 9,551 rows report a first missing or differing term: 5,299 an `ammo.*` term (per-bin availability and arcs, which MekStation's breakdown does not carry), 1,256 a `weapon.*` per-mount term, 1,204 `infantry.antiMekWeaponBV`, 968 an `equipment.*` term (577 of them `BAJumpJet`), 542 `weaponBV`, 106 `defensiveEquipmentBV`, and 176 spread over `explosivePenalty`, `section.*`, `armorBV`, `ammoBV`, `summaryModifier`, `offensiveEquipmentBV` and `speedFactor` (`ledger/tick6/analysis.json`). Closing those differences is row 3.4. The comparator exits 1 on main because of the figure differences.

## 2. Source semantics and approved vehicle corrections

- [ ] 2.1 Add focused source-format deltas and failing fixtures for serialized engine/armor codes, technology flags, real subtypes, armor ordering and equipment qualifiers. Consolidate duplicate schema facts before changing output. (`unit-entity-model`: Faithful source-unit semantics)
  - Landed #2982/#3003 require fighter heat-sink count/type source blocks,
    preserving explicit zero, aliases and existing FixedWingSupport/SmallCraft
    omission policies. Each PR's guarded conversion proof retained byte-identical
    output across all 9,815 sources; neither ran a new BV comparison or closes
    source semantics or validation.

  Landed #2956 preserves an explicit zero aerospace heat-sink source count;
  only absence uses the existing fallback. This is a source-boundary slice,
  not full schema/qualifier, construction-validity or corpus numerical parity.

  UL-06a covers vehicle source qualifiers in the converter and generated catalog
  contract, with six pinned source fixtures. UL-05 mirrors UL-04a's vehicle
  armor layouts, rejects invalid array lengths, includes 25 LargeSupportTanks
  and hands the 9 vehicle-directory FixedWingSupport sources to aerospace.
  Complete hydration, equipment qualifiers and row 3.1 remain open.
  - Open: #2532 added the code-side equipment aliases and qualifier parsing, and the owner's 2026-11-02 and 2026-11-03 catalog rulings then let the catalog gaps be filled: #2577, #2592, #2594, #2597 and #2606 corrected values to pinned Java, #2600 and #2603 kept native Java alias identities and explicit custom precedence, and #2580 added 445 pinned-Java registry records, with #2613 running its resolution guard in CI. The UL-C2 real-catalog baseline (`src/services/units/__tests__/fixtures/realCatalog.unresolved.json`, main `a561ee53a`) lists 48 unresolved ids in the committed catalogs (BattleMechs 7, vehicles 5, aerospace 0, capital 10, battle armor 1, infantry 14, ProtoMechs 11), down from 151 at tick 5 (capital 112 to 10 by #2651, BattleMechs 8 to 7). Since then #2652 added the 33 prototype-only weapons, #2680 gave the generated launchers their pinned Java combat damage, #2687 added `kgPerShot` to battle armor ammunition, the follow-up 92 generator slices #2692 and #2719 added the remaining one-shot launchers, the one-offs and the Clan battle armor one-shots, #2714 matched the Clan BA SRM-3 BV to Java, and #2725 added pinned per-item vehicle slots as an additive field nothing reads yet. The rest of follow-up 92 (IS machine gun arrays, Clan Gauss ammo, prototypes) is open. That is a different count from the 1,457 distinct input ids over 1,596 dataset and family rows that tick 3 classified against the pinned registry (`unit-loading/L-EQ3/catalog-gaps.json`), and I did not reconcile the two. The 33 prototype-only records landed in #2652, and #2615 retired the ProtoMech `kgPerShot` and infantry kit-divisor stopgaps. Code-27 prototype ferro-aluminum has no schema name, and the Mixed tech base and `DOUBLE_CLAN` heat sinks are unmapped (follow-up 30). Strict converter tests now exist for battle armor (#2499), infantry (#2500) and ProtoMechs (#2505); their equipment-id resolution is open wherever the catalog lacks the entry.
- [ ] 2.2 Implement installed vehicle engine rules and suspension in the owning modules and conversion/store callers; run affected BV and construction regressions and produce an in-memory data-impact report. (`battle-value-system`: Strict all-family numerical parity)
  - Partial #2986 resolves Dune Buggy's launcher through its retained source
    name without changing resolution precedence. Its editor weight vector becomes
    complete; all other vectors, BV and validity remain unchanged. Forty native
    support mass rows remain unresolved. Evidence:
    `normal-work/P3-vehicle/dune-buggy-20261106/`.
  - Partial #2994 transports complete native Tank weight into validation and
    corrects armor-tech selection. Retained proof reports 1,444/1,444 vehicle
    validity agreements, 9,813/9,815 globally, unchanged loads and exact BV
    totals/aggregates. Tank mass is 1,007 exact plus 22 frozen underweights among
    1,029 available totals; 57 remain unavailable. Frozen membership/totals/deltas:
    `docs/audits/2026-11-07-p3-tank-weight-known-gaps.json`; proof:
    `normal-work/P3-vehicle/tank-armor-tech-20261107/`. Complete mass parity and
    the data-impact report remain open.
  - Partial #2870: combat Tank and ground-support equipment introduction
    diagnostics now share the native owner; invalid constructions stay loadable.
    Proof at `2589ff0a1bc1bc4451789891b717c639924e3979` on base `c76abe13a`:
    9,810/9,815 validity agreements (9,808 before), zero away/lost-load changes,
    all 1,444 vehicle weight vectors unchanged. The 15 historical false
    rejections now agree in this proof; the old failure cohort is retained.
    Five all-family validity disagreements, one incomplete editor weight vector
    and 40 support sources with unresolved mass terms remain. This does not
    close installed-engine/suspension or complete mass parity. Evidence:
    `normal-work/P3-vehicle/resume-20261106/refresh-c76abe13/HANDBACK.json`.
  - Open: #2485, #2488 and #2508 now cover effective ratings, NONE/STEAM/BATTERY engines, the combat-tank handler's STEAM and BATTERY, the support-rating clamp and the false fusion error (follow-up 65 closed; support engine weight equals pinned Java on 227 of 227). #2520 added the first part of a support-vehicle construction weight model: chassis, structure, armor and fuel, with structure, engine and armor equal to Java on 227 of 227 ground support sources. #2523 then added controls, carrying space, heat sinks, amplifiers, equipment, weapons and ammunition (lane evidence, `unit-loading/L-SVW/part2/`, not re-run here): controls, heat sinks, carrying space and amplifiers equal Java on 227 of 227, but total support weight equals Java on only 172 of 227, with equipment (44 differ), weapons (38), ammunition (17) and misc (6) still wrong, mostly from missing ammo definitions and native aliases. 2 of the 8 recorded overweight disagreements remain (Estevez MBT and Debbie), and the 33 FixedWingSupport sources are outside the model (follow-up 60). The customizer keeps a second tonnage list (follow-up 55), and no data-impact report has been recorded.
- [ ] 2.3 Implement controls, lift/dive and engine-specific heat sinks; make the true Tamerlane reference pass with independently correct terms. (`battle-value-system`: Strict all-family numerical parity)
  - #2986/#2994 narrow identity and native Tank weight/validity gaps as recorded
    under row 2.2. They do not complete engine-specific heat-sink rules, source
    propagation or independently correct Tamerlane terms; the 22 frozen Tank
    underweights remain follow-ups.
  - #2870 is partial introduction-diagnostic evidence only (row 2.2). It does
    not discharge engine-specific sinks/source propagation, independent
    controls/lift terms or complete construction proof; this row remains open.
  - Controls/lift slice: construction owner, explicit no-controls store context, validation quantities and reactive component accounting implemented; see `.omo/evidence/controls-lift/`. Heat-sink rules and source-tag-to-store propagation remain open; this row stays unchecked.
  - Open: engine-specific heat-sink rules and source-tag propagation (plan slice S03, unpublished). The four Tamerlane Strike Sled variants now equal pinned Java in total and in both aggregates through the strict comparator (436, 484, 359 and 403; `ledger/tick6/run-1/delta-rows.jsonl`, unchanged on main `ac64a3330`), but in the `--per-term` run each variant's first differing term is a Java per-weapon or per-ammunition term that MekStation's breakdown does not carry (`weapon.0.FR.Flamer`, `weapon.0.FR.RL10`, and `ammo.available.SRM:2` twice; `ledger/tick6/run-per-term-trace-1/delta-rows.jsonl`), so the "independently correct terms" requirement is not shown, and vehicle BV terms elsewhere remain open (follow-up 62).
- [x] 2.4 Correct shared flank rounding, turret removal/armor, dual-turret sheet mapping, placeholder mechanism weights and genuine Omni allowances. Resolve the obsolete generic turret-capacity spec with a focused delta. Base construction and post-motive-damage flank now round upward; the same rule's aerospace max-thrust and BattleMech run-MP floors and the canonical overview table's floor text remain open. (`unit-entity-model`: Faithful source-unit semantics) Proof: #2423 (flank), #2479 and #2544 (turret capacity cap retired, generic `VAL-VEH-003` removed), #2541 (dual-turret sheet mapping), #2549, #2557, #2558, #2563, #2565 and #2566 (placeholder weights, genuine Omni allowances, nullable totals, installed turrets), #2556, #2570, #2571 and #2574 (allowance context, resolved figures, cached turret mass retired); tests: `src/utils/gameplay/__tests__/motiveDamage.test.ts`, `src/services/validation/rules/__tests__/vehicleTurretCapacityRetirement.test.ts`, `src/services/units/handlers/__tests__/CombatVehicleWeightAvailability.test.ts`, `CombatVehicleInstalledTurrets.test.ts`, `src/utils/construction/vehicle/__tests__/turretMechanism.test.ts`, `vehicleValidation.availability.test.ts`, `mountedWeight.availability.test.ts`, `src/components/customizer/vehicle/__tests__/VehicleTurretTab.figures.test.tsx`, `src/services/units/unitLoaderService/__tests__/vehicleMapping.turretWeightRetirement.test.ts`, `src/__tests__/service/printing/RecordSheetMultiTypeExport.test.ts` (all pass in the full unit run on main `4678ec34f`); evidence: `unit-loading/VPUB-replan/REPLAN.md` (every publication slice merged, no pending slice), `ledger/tick4/full-jest.json`.
  - S11: Tank/VTOL handler calculateWeight now rejects unavailable complete mass through one helper, instead of returning simplified subtotals. Parsing and support-weight ownership remain independent; nullable display composition and explicit Omni allowances remain open.
  - Owner ruling 5: retired the remaining generic VAL-VEH-003 rule, export and legacy turret-capacity shape. Legacy-shaped inputs cannot raise a cap error; total vehicle weight validation remains active. Both generic validation spec scenarios now state retirement. The canonical Data Model maxWeight snippet is deferred to sync/archive; other row 2.4 work remains open.
  - Sheet mapping slice: preview/export now carry reactive installed turret configurations, preserve zero-armor installation and bind primary/rear TU and secondary/front FT by identity. Dual-turret VTOL sheets fail explicitly. Placeholder handler weights and genuine Omni allowances remain open; row 2.4 stays unchecked.
  - Chin mechanism slice: the ordinary turret owner uses 10% for combat VTOL chin mass; test-first boundaries, validation and real-catalog budget composition are covered by the carried tests. Fresh pinned Java observations independently distinguish the former 5% rule. Placeholder display/handler weights, explicit Omni allowances and publication gates remain open; this row stays unchecked.
  - Carried: the aerospace max-thrust and BattleMech run-MP floors are rows 2.25 and 2.26 (ticked; #2421, #2425). The canonical overview table's floor text and the legacy capacity and cached-weight snippets in the canonical Data Model wait for spec sync and archive (row 5.2). Full corpus parity and the complete combat-handler weight are not claimed here (rows 2.2 and 3.4).

- [x] 2.5 Correct ProtoMech rating through the existing owner after separately verified consolidation; prove stages against pinned Java and cover chassis/reactive edits, exact inverse and movement aliases without claiming native loading or whole-unit parity. (`protomech-unit-system`: Engine Rating) Proof: #2389; tests: `src/utils/construction/protomech/__tests__/protoEngineRating.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-rating/` (3,348 chassis observations against pinned Java), `ledger/slice-tests/jest.log`.
- [x] 2.6 Consolidate ProtoMech structure without changing outputs, then correct the shared rule, source/default/reactive consumers and printing topology. All 326 refactor observations are byte-identical; 488 synthetic cases and all 86 original sources match actual pinned Java for structure, explicit absent locations and isolated standard-structure BV terms. No unrelated source fields changed; all 10 construction-invalid designs remain invalid. Existing saves, equipment, complete BV and production editor round trips remain separate. (`protomech-unit-system`: Internal Structure)

- [x] 2.7 Consolidate ProtoMech engine mass without changing either former rounding policy, then correct normal-engine mass against pinned Java, propagate it to loaded units and canonical projections, and retain invalid source ratings with unavailable mass and diagnostics. Complete mass/BV and editor persistence remain open. (`protomech-unit-system`: ProtoMech Engine Mass) Proof: #2393; tests: `src/utils/construction/protomech/__tests__/engineWeight.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-engine-mass/comparison.json` (587 Java observations), `ledger/slice-tests/jest.log`.

- [x] 2.8 Consolidate the three ProtoMech armor policies without behavior changes, then correct shared total/location limits, explicit allocation and live source diagnostics against pinned Java. All 582 cap observations match (496 synthetic, 86 originals); source fields and BV are unchanged and all 10 invalid designs remain invalid. Explicit allocations respect both caps and refresh BV; production editor/persistence, complete BV and partial-budget allocation remain open. (`protomech-unit-system`: ProtoMech Armor Limits)

- [x] 2.9 Consolidate every derived ProtoMech running policy without changing outputs, then correct ordinary/explicit-booster running and walk display through the owner and all existing consumers. Compare actual Java observations and record source equipment gaps and changed local BV separately. Jump/caps, equipment identity, persistence and complete BV remain open. (`protomech-unit-system`: ProtoMech Derived Running Movement) Proof: #2395; tests: `src/utils/construction/protomech/__tests__/runMovement.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-movement/` (5,654 Java movement comparisons), `ledger/slice-tests/jest.log`.

- [x] 2.10 Derive native ProtoMek booster state from exact pinned equipment identities and visited source locations, preserving raw entries and structured syntax failures. Compare all 86 sources and actual Java alias/mount cases; retain explicit direct-editor export, equipment legality, cost and complete BV gaps. (`unit-services`: ProtoMek source booster equipment) Proof: #2396; tests: `src/services/units/handlers/__tests__/ProtoMechBoosterSource.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-booster/`, `ledger/slice-tests/jest.log`.

- [x] 2.11 Consolidate the offensive speed exponent/rounding without behavior change, then use explicit Run for ProtoMek offensive BV and verify actual Java component/entity/source factors. Preserve source/export fields and saved movement; retain full equipment, defensive/chassis and complete BV gaps. (`battle-value-system`: ProtoMech Offensive BV and Main Gun) Proof: #2398; tests: `src/utils/construction/protomech/__tests__/offensiveSpeed.test.ts`, `protoMechBV.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-bv-movement/` (4,591 Java references), `ledger/slice-tests/jest.log`.

- [x] 2.12 Consolidate standard TMM thresholds, including the legacy validation raw-MP maximum without a jump bonus and the active BV script adapter with its inverse bracket minima, while preserving each caller contract, then correct ProtoMek/Glider defensive movement factors and verify native components, sources and store consumers. Preserve unrelated figures and saved movement; retain full-BV and production-flow gaps. (`battle-value-system`: ProtoMech Defensive BV) Proof: #2400; tests: `src/utils/construction/__tests__/battleValueMovement.test.ts`, `src/utils/construction/protomech/__tests__/defensiveMovement.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-bv-defense/` (9,227 Java references), `ledger/slice-tests/jest.log`.

- [x] 2.13 Remove unsupported ProtoMech weight/chassis BV adjustments and fix Piloting at 5 through the shared skill owner; verify seeded native components, simple loaded entities and saved-cache consumers, preserving source/export fields and retaining full-source equipment/BV gaps. (`battle-value-system`: ProtoMech Offensive BV and Main Gun; ProtoMech Chassis Multiplier; ProtoMech Gunnery Adjustment) Proof: #2401; tests: `src/utils/construction/protomech/__tests__/adjustments.test.ts`, `protoMechBV.canonical.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-bv-adjustments/` (4,131 component rows, 1,200 loaded entities), `ledger/slice-tests/jest.log`.

- [x] 2.14 Remove the unsupported ProtoMech explosive-equipment BV penalty; verify actual native stages for all 86 sources, preserve unrelated terms and saved caches, and retain full-equipment/BV gaps. (`battle-value-system`: ProtoMech Defensive BV) Proof: #2403; tests: `src/utils/construction/protomech/__tests__/explosives.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-bv-explosives/` (all 86 defensive subtotals match), `ledger/slice-tests/jest.log`.

- [x] 2.15 Preserve Clan technology in pattern-derived equipment IDs through the existing prefix owner; compare all changed captured names against native registry identities, preserve ordinary Clan LB-X vehicle ammunition through the shared matching owner (also used by its audit), and retain explicit complete-equipment/BV gaps. (`equipment-services`: Clan identity in equipment pattern resolution) Proof: #2402; tests: `src/utils/construction/__tests__/equipmentBVResolver.clanPatterns.test.ts`, `battleValueAmmo.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-clan-resolution/` (38 accepted spellings match the Java registry), `ledger/slice-tests/jest.log`.

- [x] 2.16 Separate native ProtoMek SRM 1/3/5 identities from battle-armor catalog entries; verify pinned runtime fields and aliases, official loader eligibility, source weapon BV changes and preserved legacy records. (`equipment-services`: Distinct native ProtoMek SRM catalog identities) Proof: #2405; tests: `src/services/equipment/__tests__/ProtoSRMCatalog.test.ts`, `src/utils/construction/__tests__/equipmentBVResolver.protoSRM.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-equipment-identity/`, `ledger/slice-tests/jest.log`.

- [x] 2.17 Resolve nine native Clan laser/light-weapon identities through existing catalogs and mappings, verify represented fields against pinned Java, and measure source BV, combat-data and ammunition effects without claiming complete equipment parity. (`equipment-services`: Native Clan laser and light weapon catalog identities) Proof: #2407; tests: `src/services/equipment/__tests__/NativeClanWeapons.test.ts`, `src/utils/construction/__tests__/equipmentBVResolver.nativeClan.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-native-weapon-names/` (96 Java matches, 4 exclusions), `ledger/slice-tests/jest.log`.

- [x] 2.18 Separate native ProtoMek LRM 1-4 identities and correct twelve other LRM records using pinned runtime fields; verify official-loader eligibility, BV/MTF/combat consumers, local own-name compatibility through real BA/ProtoMech store writers and preserved source/ammo boundaries. (`equipment-services`: Native ProtoMek LRM catalog identities) Proof: #2408; tests: `src/services/equipment/__tests__/ProtoLRMCatalog.test.ts`, `src/utils/construction/__tests__/equipmentBVResolver.protoLRM.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-lrm-identity/` (64 Java matches, 268 exclusions), `2026-10-30/claude-coordinator/lrm-2408-sync/`, `ledger/slice-tests/jest.log`.

- [x] 2.19 Consolidate cluster lookup/table copies with unchanged captures, then correct integer racks 1-20 against pinned Java and exercise shared combat and preview consumers. Ammo eligibility, complete ProtoMech combat and larger racks remain open. (`combat-resolution`: Native cluster hits for represented integer racks) Proof: #2409; tests: `src/utils/gameplay/__tests__/clusterWeapons.native.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-combat-readiness/` (220 rack/roll cases), `ledger/slice-tests/jest.log`.

- [x] 2.20 Consolidate repeated ammo classification/count checks and projection without behavior changes, then require explicit usable ammo state for known missiles with unspecified capacity; prove AI, preview, runner firing/depletion and ordinary controls. Pin the inherited engine/interactive-session display-name refusal separately from successful AI selection. Session firing identity, source identity/quantity/topology, implicit ammo and full BV remain open. (`ammo-tracking`: Unknown missile capacity requires explicit ammunition state) Proof: #2410; tests: `src/utils/gameplay/__tests__/missileAmmoReadiness.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-ammo-readiness/`, `ledger/slice-tests/jest.log`.

- [x] 2.21 Preserve known missile category independently of capacity metadata at the weapon attack boundary; verify its Gunnery Specialist to-hit effect through real hydration and isolate category-dependent targets in mixed volleys through declaration and serialized resolution, preserving shared context and legacy fallbacks. Complete native categories, multi-SPA precedence, ID/name-dependent volley effects and category propagation through tactical previews and committed human interactive attacks remain open. (`spa-combat-integration`: Gunnery SPA — Gunnery Specialist) Proof: #2412; tests: `src/utils/gameplay/__tests__/declareAttack.gunnerySpecialist.test.ts`, `weaponAttackBuilder.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/missile-category/comparison.json` (2,592 category-context comparisons), `ledger/slice-tests/jest.log`.

- [ ] 2.22 Consolidate offensive ammo grouping/cap arithmetic across shared, ProtoMech and aerospace owners while preserving their distinct policies and all source outputs; then connect native ammunition identity, effective quantities and grouping with independent numerical proof. Defensive caps and incomplete native ammunition receive no parity credit. (`battle-value-system`: Offensive ammunition cap ownership)
  - Partial #2985 retains native availability diagnostics for unmatched
    ProtoMech ammunition without inventing caps or changing arithmetic; all 86
    existing captures remain byte-identical. Its blocking-trust proof reports
    exact BV for all 9,815 units and no census movement.
  - Partial #2991 projects raw offensive caps for positive native ammunition
    bins, closing 71 terms with no other movement. Retained blocking-trust proof
    reports 4,224 matched / 5,591 diagnostic rows / 109,885 missing-local terms;
    ProtoMechs remain 0/86/130. Existing capture fields and BV are unchanged.
    Effective quantities, defensive caps, Sprite 3 indices and other-family
    ammunition coverage remain open. Evidence:
    `normal-work/P4-ammo/proto-cap-projection/PROOF.json`.
  - Owner ruling (2026-11-08), `PARITY-PLAN.md` §9 O1: reproduce every per-term key,
    including per-trooper battle armor, per-mount weapons, per-bin ammunition and
    arcs, and infantry sub-terms. Missing projections remain required coverage;
    total/aggregate equality does not discharge them.
  - Partial #2959 projects positive native ProtoMech ammunition availability:
    79 bins on 61 units close 71 missing terms, preserving old figures and cap
    arithmetic. Guarded proof at `74fdeb9d5bbfac42b7aaf156b259869a44f286d0`
    joins all 9,815 with exact totals/aggregates. Root accepted this already-running
    pre-#2955 CLI cohort once; it has no reference-provenance report and supplies
    no trust-acceptance proof. Other ammo/cap groups, effective quantities,
    topology and defensive caps remain open. Receipt:
    `normal-work/P4-ammo/proto-ammo-availability/PROOF.json`.
  - Open: the preserving consolidation merged (#2413; `src/utils/construction/__tests__/offensiveAmmoPolicies.test.ts`, 24,506 byte-identical observations). Native ammunition is connected for ProtoMechs only: #2517 prices ProtoMech ammo per Java kg-per-shot through a cited stopgap table (`protoMechAmmo.ts`) that waited on catalog `kgPerShot` data. The catalog now carries `kgPerShot` (#2580) and #2615 retired the stopgap table and the infantry kit-divisor table. ProtoMech BV is 86 of 86 exact and infantry 1,820 of 1,820 on main `ac64a3330` (#2695 closed the 74 infantry field-gun misses). Vehicle and aerospace native ammunition identity, effective quantities and grouping still lack independent per-term proof: the strict comparator now leaves 39 vehicle misses (14 of them farther than 1%) and 6 aerospace misses (`ledger/tick6/misses.tsv`; 89 and 84 at tick 5), but the `--per-term` run still reports an `ammo.*` term as the first difference on 1,085 of the 1,444 vehicle rows and 19 of the 620 aerospace rows, because MekStation's breakdown has no per-bin ammunition term (row 1.4). I did not attribute the remaining misses to causes this pass. #2617 pooled artillery cannon ammo apart from artillery (follow-up 81 records the Schwerer Gustav defensive +18 it exposed). Converted ammunition ids are largely resolved by #2484, #2497 and #2580 (follow-ups 49, 63 and 68; row 2.1 has the unresolved counts).

- [x] 2.23 Resolve ammunition within the existing BV catalog owner using its source collection, preserve generic/MTF lookup and reject weapon-only ammo identities through real consumers. Verify collisions, explicit custom context/reset, all captured lookup effects and all-family regression outputs. Native aliases, quantities, grouping, mount topology and full BV remain open. (`equipment-services`: Ammunition context in BV catalog resolution) Proof: #2414; tests: `src/utils/construction/__tests__/equipmentBVResolver.ammunition.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/ammo-catalog-context/comparison.json` (226,164 captured strings), `ledger/slice-tests/jest.log`.

- [x] 2.24 Consolidate the total-to-projectile missile damage conversion and missile rack identification without behavior change, then correct expected-damage/variance previews and their selector/forecast consumers against pinned MegaMek damage-per-missile semantics. Unchanged runner and selected-AMS outputs are proven for every hydrated cluster/Streak launcher; hydrated LRM/SRM/ATM/MML/Streak previews, and native ProtoMek LRM previews, now equal the runner's resolution. UAC/RAC rate-of-fire and LB-X cluster/slug previews, MRM and other situational cluster modifiers in previews, ATM's built-in +2 cluster modifier (`ATMHandler.java:236-250`, in neither the runner nor the previews), MegaMek's own MRM 30/40 cluster rows (racks above 20 snap to the 20 column), the MML LRM/SRM mode, crit-probability location grouping, the independent damage-times-hit-probability estimators (per-weapon to-hit projection, volley ledger, AI coordinator), which assume every missile lands and, on the demo route, still read the unconverted per-missile display strings; ATM extended-range and high-explosive munition damage per missile (hydrated as standard 2); damage-per-hit callers, source BV and complete ProtoMech combat remain open. (`combat-resolution`: Native cluster hits for represented integer racks; `to-hit-resolution`: Missile damage previews use per-projectile damage) Proof: #2415 (+#2418); tests: `src/utils/gameplay/__tests__/clusterWeapons.projectileDamage.test.ts`, `clusterWeapons.missileRack.test.ts`, `src/utils/gameplay/damage/__tests__/expectedDamage.hydrated.test.ts`, `src/utils/gameplay/toHit/__tests__/preview.test.ts`; evidence: `2026-10-30/claude-coordinator/cluster-step1/`, `2026-10-30/claude-coordinator/cluster-step2/`, `ledger/slice-tests/jest.log`.

- [x] 2.25 Round base BattleMech run MP upward in the construction calculation service that feeds customizer Battle Value, verified against pinned MegaMek and the catalog BV reference. MASC, supercharger, TSM, hardened-armor and shield movement in the customizer path (odd-walk hardened-armor BattleMechs now read run MP one above MegaMek), and the remaining floor text in the canonical movement-system, hardened-armor-combat and README specs, remain open. (`movement-system`: Walk/Run MP Calculation) Proof: #2421; tests: `src/services/construction/__tests__/CalculationService.test.ts`, `CalculationService.coldStart.test.ts` (74 pass); evidence: `2026-10-30/claude-coordinator/mech-run-mp/`, `ledger/slice-tests/jest-2.25.log`.

- [x] 2.26 Consolidate the aerospace max thrust derivation across BLK basics, handlers, defaults, store actions and templates without behavior change, then round it upward against pinned MegaMek `Entity.getRunMP` for every airborne aerospace family and propagate it to the aerospace BV adapter inputs. Compare actual Java walk/run MP over the aerospace sources first; the `BlkParserService` aerospace parse result, JumpShip/space-station station-keeping thrust, aerospace BV formula parity and catalogs remain open. (`aerospace-unit-system`: Aerospace max thrust ownership) Proof: #2424 (+#2425); tests: `src/utils/construction/aerospace/__tests__/thrustCalculations.test.ts`, `src/stores/__tests__/aerospaceMaxThrust.consumers.characterization.test.tsx`, the four aerospace handler parsing suites; evidence: `2026-10-30/claude-coordinator/aero-max-thrust/` (max thrust equals pinned Java on 981 of 981 loaded aerospace and capital rows, 480 before), `ledger/slice-tests/jest.log`.

## 3. Complete typed data flows

- [x] 3.03 Share the existing ammunition-bin projection without changing its output, then forward live counts through the selector/forecast consumers and verify ammo-only updates; retain unknown-capacity readiness, active-composer and native ammunition gaps. (`to-hit-resolution`: Ammunition counts in preview consumers) Proof: #2411; tests: `src/components/gameplay/__tests__/ammoPreviewCounts.test.tsx`, `CombatPlanningPanel.sections.test.tsx`, `src/utils/gameplay/__tests__/ammoProjection.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/ammo-preview-counts/refactor-comparison.json` (192 byte-identical projections), `ledger/slice-tests/jest.log`.

- [x] 3.02 Extract ProtoMek equipment syntax without changing outputs, then retain parsed block/entry identity, explicit shots/size/rear-prefix and diagnostics through handler/store projections, saved-state loading and bounded BLK reload. Verify actual native shot/size observations; retain resolved identity, Body topology, general serialization and full equipment/BV gaps. (`unit-services`: ProtoMek equipment source syntax) Proof: #2404; tests: `src/services/conversion/__tests__/BlkProtoEquipmentEntry.test.ts`, `src/services/units/handlers/__tests__/ProtoMechEquipmentSource.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-equipment-syntax/` (18,873 effects and 86 sources preserved; 186 Java shot/size loads), `ledger/slice-tests/jest.log`.

- [x] 3.01 Consolidate the ProtoMek BLK equipment projection without changing output, then reject flag/emitted-booster disagreement and unrepresentable equipment text without content or input mutation. Verify existing source export bytes and actual Java reload; production mount editing, arbitrary saved-flank export, complete equipment and BV remain open. (`unit-services`: ProtoMek booster export integrity) Proof: #2396; tests: `src/services/conversion/__tests__/BlkExportService.protoMech-booster.test.ts`; evidence: `2026-10-29/astra-coordinator/root-continuation/protomek-booster-export/` (Java reload of the export reproductions, zero mismatches), `ledger/slice-tests/jest.log`.

- [x] 3.0 Extend/consolidate existing schema ownership into a documented portable versioned design contract, explicit units/identities/extensions, migrations, examples and independent-consumer conformance tests; keep legacy syntax in adapters. (`unit-entity-model`: Portable versioned unit documents) Proof: #2610 (contract `docs/data/portable-unit-contract.md` and `schemaVersion`), #2612 (migrations and generated examples), #2614 (independent consumer); tests: `src/types/contracts/__tests__/unit.version.contract.test.ts`, `src/types/contracts/__tests__/portable-unit-migration.test.ts` (2 suites, 64 tests pass), `scripts/__tests__/test_portable_unit_reader.py` (10 tests OK), the independent reader CLI `python scripts/portable_unit_reader.py` over the committed catalogs and the seven examples (exit 0) and `scripts/generate-portable-unit-examples.ts --check` (no drift, exit 0); evidence: proven on the merged tree at main `86790ec24`, not on the fixed measurement SHA `4678ec34f`, because #2614 merged after it (`ledger/tick4/row30/`); lane evidence `unit-loading/L-PORT/HANDBACK.md` (r2).
  - Carried: the reader checks the committed documents against the JSON Schema and the contract text alone (no application imports). Legacy document syntax (flat armor, `BAR_N`, cached turret weights) is handled by the explicit migration in `src/utils/serialization/portableUnitDocument.ts`, which the contract describes; I did not audit the BLK and MTF converters for other legacy syntax.
- [ ] 3.1 Extend existing schemas, family handlers and validators for every inventoried construction family; include invalid-but-loadable designs with explicit diagnostics and preserve unsupported records during rollout. (`unit-entity-model`: Faithful source-unit semantics)
  - #2982/#3003 tighten fighter source admission only (row 2.1). #2994's
    retained validity proof reaches 1,444/1,444 vehicles and 9,813/9,815 globally
    (row 2.2); two nonvehicle disagreements remain. These are lane measurements,
    not a fresh merged-tree all-family acceptance run.
  - #2956 preserves zero-sink source admission without changing validation.
    #2870's introduction-diagnostic and #2961's public vehicle-validity slices
    are recorded under rows 2.2 and 3.4; neither closes all-family validation.
  - [x] 3.1a Separate VTOL/SmallCraft BLK source loading from construction limits, retain original values and existing validation diagnostics, and reject unusable numeric fields. Verified all 170 pinned rows by source index/path/blob/SHA-256: 160 to 170 loaded, all 10 recovered rows construction-invalid, existing successful data and validation unchanged except unit diagnostic fields; 317 focused handler/parser/construction/BV assertions pass. This closes only this boundary slice; the all-family row, numerical parity and round trips remain open. (`unit-services`: VTOL and SmallCraft source loading diagnostics)
  - Open: vehicle, aerospace and capital converters and catalogs are on main (#2469, #2486). Battle armor and infantry now have strict converters (#2499, #2500) and committed catalogs of 1,188 and 1,820 designs (#2513, #2515), and their handlers accept the pinned sources (#2509). ProtoMechs have a strict converter and a registered family (#2505) and a committed catalog of 86 designs (#2526). Vehicle Java validity agrees for 1,423 of 1,444 designs (follow-up 60). #2568 compared validity per unit with the oracle's `construction.valid` for ProtoMechs, aerospace and capital (`unit-loading/L-VAL/`, lane figures, not re-run here). After it, ProtoMechs agree on all 86 (85 valid and 1 invalid in both; the corpus-load run on main `ac64a3330` also counts 1 invalid, `ledger/tick6/corpus-load/`). Aerospace has 596 valid in both, 6 valid here only, 1 valid in Java only and 17 FixedWingSupport sources with no local result (Java: 14 valid, 3 invalid). Capital has 350 valid in both and 44 valid here only. Mech validity work: #2607, #2608 and #2616 (mech critical slots against the selected cockpit) are on main, and so are #2620 (HVAC explosive penalty), #2622 (split-weapon criticals across adjacent locations), #2633 (13 introduction years) and #2634 (the Mek turret marker stripped from slot names). #2595 added the equipment introduction-year check for aerospace and fixed-wing sources (`AeroIntroYear.test.ts`), and #2647 and #2660 ported Java's armor and engine introduction-year checks for combat vehicles (#2647 flipped Fury CX-17 and #2660 Ground Car and Jeep, all toward Java, by the PR bodies' own guard runs; lane figures, not re-run). #2536 made the battle armor and infantry handlers' `validate` agree with the oracle's `construction.valid` on all 1,188 and all 1,820 sources (4 and 30 invalid, Java's diagnostic kept; `PersonnelValidity.test.ts` and `BattleArmorUnitHandler.validation.test.ts` pass in the main-push unit run 41932845917 on main `ac64a3330`, `ledger/tick6/ci-pass-files.txt`; the corpus-load run counts the same 4 and 30, `ledger/tick6/corpus-load/`). Invalid-but-loadable diagnostics are therefore still unproven for aerospace (7 disagreements and 17 sources with no result) and capital (44 disagreements); vehicle validity was not re-compared here: follow-up 95 records 13 vehicles valid here and invalid in Java after #2635 (21 at #2475; a lane figure, not re-run), which the three flips of #2647 and #2660 would leave at 10 if the lane figures hold, with the Java weight, slot and compatibility checks (follow-up 95 (b) to (e)) still to port.
- [ ] 3.2 Connect browser/Node canonical discovery and direct source imports to the same domain contract; correct field/discriminator mismatches at the boundary. (`unit-services`: Family-aware loading and persistence)
  - Historical #2983 added MTF selection/drop and conflict-renaming through
    the existing import API, with 53 focused tests including real SQLite/API/client
    reload. `d21c8a55c` later deleted the unmounted `ImportUnitDialog` and its
    tests; this does not establish a current browser file-import entry. The MTF
    API survives; browser selection remains open.
  - Partial #2993 adds ProtoMech BLK API import through the existing parser,
    handler and shared validator. Seventy-seven tests include real SQLite/API/client
    reload of 31 pinned fixtures, retained source facts and construction
    diagnostics. Other BLK families receive explicit unsupported-type diagnostics;
    their imports and the legacy runtime-object importer remain open.
  - Owner ruling (2026-11-08), `PARITY-PLAN.md` §9 O2: extend the API to every BLK family
    (capital read-only), mount a file-import entry on the unit library page, and
    retire the legacy `IMTFImporter`. These are approved required follow-ups,
    not implementation or acceptance claims from this intake.
  - Partial #2954: the MTF import API uses the existing parser and shared
    family-aware definition validator, then persists a new custom identity.
    Five focused suites/89 tests cover pinned source, real SQLite persistence
    and saved-unit API/client reload; no browser journey or full-corpus claim.
    BLK import, browser file selection and the legacy runtime-object importer
    remain open. Evidence: `normal-work/P5-loading/mtf-api/PROOF.json`.
  - [x] 3.2a Native ProtoMek BLK projection: all 86 pinned sources load with chassis, base movement/rating, declared rules level, armor locations and main-gun topology equal to actual pinned Java. All 86 scoped exports reload in Java with those fields unchanged; the test adapter is not a production import-to-store path. Existing construction diagnostics mark 10 designs invalid. At that slice's head all 86 retained internal-structure mismatches, subsequently corrected by 2.6. Equipment resolution, construction-rule fidelity, persistence and complete BV remain open. (`unit-services`: Native ProtoMek source projection)
  - Open: canonical discovery is family-aware (#2432, #2454, #2457, #2452, #2466). #2954 now provides direct MTF API import; BLK import, browser selection and the legacy runtime-object importer remain open; the BFS files are no longer a gap, because the owner excluded all six (#2578). ProtoMechs are a family in `UNIT_FAMILIES` (#2505) with a catalog (#2526), and battle armor and infantry have catalogs and `index.json` (#2513, #2515), and #2529 and #2534 now open ProtoMechs, battle armor and infantry from the library into their existing stores (the catalog replays open 86 of 86, 1,188 of 1,188 and 1,820 of 1,820, `ledger/tick6/library-open/`; `smallUnitLibrary.test.tsx`, `openFromLibrary.test.tsx` and `familyCatalog.test.ts` pass in the main-push unit run 41932845917 on main `ac64a3330`). Per-file counts on main `ac64a3330` (`ledger/tick6/corpus-load/`, identical to tick 5; `ledger/ACCEPTANCE-STATUS.md` check 2): all 9,815 in-scope pinned files open in an editor or viewer (BattleMechs 4,263, vehicles 1,444, aerospace 620, capital 394 read-only, battle armor 1,188, infantry 1,820, ProtoMechs 86). The owner excluded all six BFS files (#2578, ruling 2026-11-02 item 4), so the 5 BFS files that the corpus-load harness still lists as unsupported are no longer a gap (the harness's corpus file predates the ruling). The BattleMech catalog was regenerated from the pin (#2581; 4,263 rows, none missing), so the 74 missing rows of tick 3 are gone; 133 blank-model designs join the catalog only through the `Unknown` model name. The corpus-load harness counts the editor open for battle armor, infantry and ProtoMechs through the catalog replays (`SMALL_CATALOG=1`, `INFANTRY_CATALOG=1`, both exit 0), not by its own bucket. BLK import, browser file selection and the legacy runtime-object importer remain open.
- [ ] 3.3 Prove semantic serialization/save/reload for each subtype, with multiplicity, topology and custom/source identities preserved. (`mtf-parity-validation`: All-family semantic round trips) Proof: #2546 (vehicles), #2550 (aerospace and small craft), #2561 (ProtoMechs and battle armor), #2567 (infantry), #2569 (family kept on force, roster and session references), #2518 and #2611 (capital ships: open, view, BV and print, read-only per owner ruling 3, `OWNER-RULINGS-20261030.md` "2026-11-03 (evening): tick-4 owner decisions" item 2); tests: `src/services/units/unitLoaderService/__tests__/vehicleMapping.test.ts`, `aerospaceSave.test.tsx`, `smallUnitSave.test.tsx`, `infantrySave.test.tsx`, `src/services/forces/__tests__/ForceRepository.helpers.test.ts`, `src/components/customizer/capital/__tests__/CapitalShipCustomizer.test.tsx`, `src/__tests__/service/printing/capitalRecordSheets.test.ts`, `capitalTemplated.test.ts`, `recordSheetFigures.test.ts` (all pass in the main-push unit run 41932845917 on main `ac64a3330`, `ledger/tick6/ci-pass-files.txt`; some cases are skipped, see Carried); evidence: `unit-loading/UL-25a/`, `UL-25b/` and `UL-25c/` (lane figures, not re-run: the production mapper, serializer, JSON and mapper compare equal for 1,444 of 1,444 vehicles and 620 of 620 aerospace and small craft, and 86 of 86 ProtoMechs, 1,188 of 1,188 battle armor and 1,820 of 1,820 infantry pass semantic, BV and validity round trips), `ledger/tick6/corpus-load/` and `library-open/` (all 394 capital ships open read-only; the catalog replays open every battle armor, infantry and ProtoMech design), `ledger/tick6/run-1/delta-rows.jsonl` (capital BV: 246 exact, 6 within 1%, 3 farther, 139 defensive-only and labelled so).
  - Carried: the family on force and roster references covers vehicles and aerospace (#2569 rejects unsupported combat families, so battle armor, infantry, ProtoMechs and capital cannot yet be in a force; follow-up 32), and saved non-mech combat snapshots are not in #2569. The vehicle and aerospace proofs are mapper-level and integration cases; the browser journeys for eight families ran on the SHA in the main-push run (`customizer-library-open.spec.ts`, 52 tests passed; rows 4.2 and 4.4). `infantrySave.test.tsx` skips 1 case, `capitalTemplated.test.ts` runs 3 and skips 7 (skip counts as at tick 5, not re-counted): its pinned-mm-data cases need `RECORD_SHEET_PINNED_ASSETS` and the pin under `_scratch/upstream-pins-20261028/mm-data` holds no record sheet images, so only the repository-asset cases ran. Capital BV is complete for 255 of 394 designs (246 exact, 6 within 1%, 3 farther) and defensive-only for 139 (row 3.4).
  - Reopened 2026-11-09 by master ruling (no accepted carve-out): BattleMech
    custom save/reopen does not preserve Mixed-Tech equipment identity. This
    invalidates the row's "custom/source identities preserved" claim for
    BattleMechs only; the family evidence above stands at its stated scope.
    Evidence: `parity-3.2-x/EDITOR-SELECTIONS.md` (runtime head
    `f79e7b1a24ab1a1bf3f8abd0e37b0764b00073b0`, catalog base
    `ca66910a141f06098e358c6bd5b72fec335923bf`). Equipment-ID multisets drift
    between save and reopen on 16 of 22 sampled units, in 192 of 264 journeys,
    with or without the chassis overlay. For example, Shadow Hawk C saves
    `clan-er-medium-laser` and reopens as `er-medium-laser` with Inner Sphere
    tech. The journeys run in jsdom through the production controls, stores,
    serializers and API client, with SQLite behind a fixture HTTP adapter;
    they are not browser or server-route proof. 264 of 264 journeys completing
    does not mean identity was preserved. The fuller 3.2-y baseline census
    (`parity-3.2-y/C5-ACCEPTANCE.md`, product
    `f529838e54b8fd1510e217b47339ca1ecf2dc885`, same jsdom
    save/API-client/SQLite/custom-reopen path) is failing baseline evidence,
    not a fix. 505 of 505 journeys completed and every saved ID is correct in
    SQLite. After reopen, 190 of 505 keep equipment ID and tech. Mixed fails
    on 315 of 377 (213 of 257 IS-chassis, 102 of 120 Clan-chassis), and all
    128 sampled pure controls keep ID and tech. Separately, mount category
    drifts (ammo becomes weapon on shared IDs) in 51 of 377 Mixed units, 1 of
    64 pure IS and 18 of 64 pure Clan controls. The eleven selection fields
    and eight component-tech selections pass 505 of 505, which does not
    establish identity. A fix cannot reconstruct designs already reopened and
    resaved with the wrong ID. Owner: C3. 3.2-y fixes Mixed equipment identity
    and 3.2-z fixes mount category drift, as separate PRs. Reclosure gate:
    both y and z merged, the recorded topology and critical-grid findings
    resolved, and a fresh semantic identity, multiplicity, category and
    topology proof on merged main, with unrelated parser or load failures
    recorded separately. A passing identity result alone does not close the
    row.
- [ ] 3.4 Run complete per-family construction/BV comparisons against matched references. Record per-unit and component differences, upstream failures and justified inapplicable metrics. (`battle-value-system`: Strict all-family numerical parity)
  - #2985/#2991's retained ammunition proofs update the detailed census as
    recorded under row 2.22; #2994's retained construction proof is recorded under
    rows 2.2/3.1. None is a new merged-tree acceptance batch or complete component
    parity.
  - Test-only #3000 pins six canonical BV values and verifies the rule-derived
    medium-laser increase. A temporary +1 BV mutant passed all 13 former adapter
    tests but failed seven new exact assertions; the unmodified implementation
    passes all 18 adapter tests. No production calculation or full-corpus proof
    changed.
  - Owner ruling (2026-11-08), `PARITY-PLAN.md` §9 O1: reproduce every per-term key,
    including per-trooper battle armor, per-mount weapons, per-bin ammunition and
    arcs, and infantry sub-terms. Trace-only omissions are not an accepted
    substitute for the required projections; the final detailed comparison
    remains required.
  - Accepted scoped refresh, recorded on main `4c5481001`: #2951 merged as
    `e86866ba2de11bbcc032a6a1a06087863d2bc37b`; its numerical execution was
    `45fc5728bd76b5e27526efa7a4b15c7f6df00a6c` on integrated base
    `2bf3ae4106917cd9035d76893f7c9f1a9723a81d`, not a post-merge run. The
    retained fresh guarded proof has 9,815 distinct exact joins/totals/aggregates,
    4,224 detailed matches, 5,591 diagnostic rows and 110,027 missing-local
    terms, with zero finite differences in every family. Thirteen ProtoMech
    misc terms close across 11 units; no additional row completes. ProtoMechs
    still have 0 matches / 86 diagnostic rows / 272 missing terms. The prior
    #2946 census (4,224 / 5,591 / 110,040) and tick-6 figures below are historical.
    Evidence: `normal-work/P4-ammo/proto-misc-projection/PROOF.json` and P6's
    [independent retained-artifact census](E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/normal-work/P6-comparison/post-2951-census/REPORT.md).
    This closes no validity, weight, verifier-quantity/settings, infantry
    instrumentation or live-policy adoption gap; Sprite 3 raw-index limitations
    and all remaining term omissions stay explicit. No checkbox changes.
  - Fulfilled reference prerequisite: #2955 plus #2958 and the accepted
    full-9,815 policy proof satisfy the provenance/settings prerequisites
    previously carried from row 1.3 (proof and execution identities there).
    Blocking remains off and CI unchanged. Full numerical/validity/weight/
    verifier-quantity coverage is still open; all 1,820 applicable but
    uninstrumented infantry additive maps remain failed coverage, never
    successful or inapplicable metrics. No row 3.4 tick or full parity closure.
  - Partial #2961 at `4324c1d8cd832a9af05daec66ca5efa2ad88272a`, base
    `df42b26095a27bcb67a1bb44b17d4db97d276c7f`: 1,444 vehicles compared through
    public source handlers, 1,439 validity matches / 5 differences / 0 vehicle
    failures. Full instrumented validity is 4,533 matches / 5 differences /
    1,014 explicit out-of-scope BLK failures / 4,263 missing MTF results;
    54 invalid results match, with zero weight/quantity/settings comparisons.
    This proof predates #2870 and is separate from its all-family harness;
    do not combine their denominators or infer a new integrated acceptance run.
    Retain later covering proof with final merged validators/current inputs.
    Root approved one UTF-16 startup restart before any corpus execution;
    the successful 106.8-second proof-run-2 is retained, with no Java/third ticket.
    Receipt: `normal-work/P6-comparison/vehicle-validity/PROOF.json`.
  - Open: complete per-family comparisons are not met. On main `ac64a3330` the strict comparator (#2514, #2533, #2540) joins all 9,815 UL-16b oracle rows by path and SHA-256 and exits 1; two runs give byte-identical reports (`ledger/tick6/repeat-hashes.txt`, report SHA-256 `e4be6ee5…473d1`, rows `f684df90…da105`). Exact totals, then within 1% (including exact), farther, not computable, not complete and invalid: BattleMechs (the `validate:bv` calculator, fresh conversion) 4,115 / 4,234 / 29 / 0 / 0 / 0 of 4,263; vehicles 1,405 / 1,430 / 14 / 0 / 0 / 0 of 1,444; aerospace 614 / 614 / 6 / 0 / 0 / 0 of 620; capital 246 / 252 / 3 / 0 / 139 / 0 of 394, where 139 are defensive-only because mounts are unresolved (not a figure match); ProtoMechs 86 / 86 / 0 / 0 / 0 / 0 of 86; battle armor 1,185 / 1,185 / 3 / 0 / 0 / 0 of 1,188; infantry 1,820 / 1,820 / 0 / 0 / 0 / 0 of 1,820. That is 9,471 exact of 9,815 (8,934 at tick 5, 8,600 at tick 4, 6,724 at tick 3, 4,633 at tick 2). No row that was exact at tick 5 is inexact now, and 537 became exact (battle armor 231, capital 101, aerospace 78, infantry 74, vehicles 50, BattleMechs 3). Infantry and ProtoMechs now match Java's total on every row. The 344 remaining rows are listed in `ledger/tick6/misses.tsv`. 43 of the exact rows fail the aggregate check (BattleMechs 40, vehicles 3; 69 at tick 5). I did not attribute the remaining misses to causes this pass: the lanes' cause lists predate the catalog regeneration and most of the work since tick 5 acted on them. BattleMechs through the app were not re-run: at tick 5 (`ledger/tick5/mech-bv/`) the gate calculator, the `bvAdapter` force path and the customizer path agreed on all 4,263 designs (4,108 exact), 4 below the comparator on four FrankenMek designs whose committed catalog files predate #2619 (follow-up 84, owner). Per-term parity is not shown (row 1.4, ticked as an implementation): now that the adapters for all seven families are on main, `--per-term` against the trace-bearing reference `unit-loading/L-ORC2b/run-1/full.jsonl` shows 264 of 9,815 rows matching every term (BattleMechs 70, vehicles 159, aerospace 35) and 9,551 still reporting a first missing or differing term, mostly per-bin ammunition and per-mount terms that MekStation's breakdown lacks (row 1.4 has the breakdown). Figures and logs: `ledger/tick6/`, `ledger/ACCEPTANCE-STATUS.md` check 3.
- [x] 3.5 Prepare catalog impact and reviewable generation commands; obtain the owner's required approval before vehicle catalog regeneration, then validate generated data and consumer coverage. (`unit-services`: Family-aware loading and persistence) Proof: #2469, #2486 (vehicle, aerospace and capital catalogs), #2513 (battle armor), #2515 (infantry), #2526 (ProtoMechs), #2581 (BattleMech catalog regenerated from the pin), #2538 (UL-C2 real-catalog guard), #2580 and #2613 (generator and resolution guards in CI); tests: `src/services/units/__tests__/realCatalog.families.test.ts`, `realCatalog.battlemechs.1.test.ts`, `.2.test.ts`, `.3.test.ts`, `shippedCatalog.test.ts`, `battleArmorCatalog.test.ts`, `infantryCatalog.test.ts`, `src/__tests__/service/printing/catalogRecordSheets.<family>.test.ts` (eight files since #2679 split the suite; all pass, with the rest of this list, in the main-push unit run 41932845917 on main `ac64a3330`), `node --test scripts/equipment-catalog/generate.test.mjs scripts/equipment-catalog/resolution.test.mjs scripts/equipment-catalog/runner-damage.test.mjs` (16 of 16 pass on main `ac64a3330`, `ledger/tick6/node-test-catalog.log`; 17 of 17 on the merged tree with main `29462dff0`, `ledger/tick6/node-test-catalog-merged.log`); evidence: the committed `index.json` counts are BattleMechs 4,263, vehicles 1,444, aerospace 620, capital 394, battle armor 1,188, infantry 1,820 and ProtoMechs 86, which is 9,815, the UL-16b oracle row count; `ledger/tick4/corpus-load/` (BattleMechs 4,263 of 4,263 join a catalog row, 4,130 by name and 133 blank-model designs through `Unknown`); `ledger/tick4/library-open/` (the catalog replays open 1,188 of 1,188 battle armor, 86 of 86 ProtoMechs and 1,820 of 1,820 infantry); owner approvals: rulings of 2026-10-30, 2026-11-01 (ProtoMechs) and 2026-11-02 (BattleMech catalog, item 3).
  - Carried: what the catalogs still lack is row 2.1 and the owner questions in `OWNER-QUESTION-CATALOG-20261102.md` (151 unresolved ids in the UL-C2 baseline). Direct source import is row 3.2.

## 4. Forms, layouts and connected workflows after data readiness

- [ ] 4.1 Map upstream editor fields to local family descriptors; add correct forms, loading skeletons and location diagrams without fallback to unrelated editors. (`customizer-tabs`: Data-ready subtype editors)
  - #2990/#2992 deliver printing from explicitly supplied tripod/QuadVee crew
    rosters (row 4.3), superseding the earlier rendering deferral at that scope.
    Crew-roster authoring and persistence remain open; supplied print identity
    does not establish an editor workflow.
  - Owner ruling (2026-11-08), `PARITY-PLAN.md` §9 O3: match the pinned MegaMekLab tabs
    per family; sibling-editor reuse is acceptable. F4 (Mixed tech outside mechs),
    F7 (fluff editing) and F11 (capital view fields) are deferred. This defines
    the required editor scope without asserting that its forms are complete.
  - Deferred gap (Root ruling, 2026-11-06): tripod and QuadVee SPA printing
    remains open because the current print payload has one pilot and no
    crew-slot identity. Q-PILOT owns the required multicrew print-identity
    contract from pinned MegaMek tripod-cockpit and QuadVee driver/gunner
    behavior, starting after #2948 slot completion and coordinating the shared
    type with P7. P7's single-pilot LAM slice proceeds now without inventing
    crew slots. This sequences the work; it does not waive eventual coverage
    of all unit, weapon and pilot quirks and SPAs or complete this row.
  - Open: the subtype panels the tick-3 clause listed as missing are now on main: six-side SuperHeavy and dual-turret armor (#2598), FixedWingSupport construction fields (#2602), LargeSupportTank six-side armor and Omni turret allowance summaries (#2605). Capital ships open in a read-only viewer with Overview and Structure tabs (#2518) and diagnostics (#2576), which is a view, not an editor (owner ruling 3). Battle armor, infantry and ProtoMek shells open their catalog units from the library (#2529, #2534) and save and reopen with the complete validated source definition kept as `librarySource` (#2561, #2567), so source fields are retained rather than edited. Not shown: that every upstream editor field maps to a local family descriptor with a form, loading skeleton and location diagram for every family; the panel PRs prove their own panels in the browser, and the E2E shards of the main-push run on `ac64a3330` passed (`customizer-library-open`, `customizer-edit-recovery`, `customizer-equipment-catalog`, `customizer-record-sheet-rendering`), but I did not audit the field list per family. Follow-up 90 records that the editor's slot grid, auto-fill and save/reopen do not yet handle split weapons or cockpit-specific head layouts, which validation now does (#2616, #2622).
- [x] 4.2 Wire edits to domain calculations/validation and persist them through save/reopen for every family; retain canonical clone protection. (`customizer-tabs`: Data-ready subtype editors) Proof: #2590 (browser journeys for eight real catalog families), #2781 (canonical clone-protection journey), #2791 (mech Mixed Tech per-component tech bases kept through reopen), #2793 (saved aerospace `unitType` follows the Sub-Type), #2794 (ProtoMech tonnage moves into the chassis range on a chassis change), #2763 (Ultraheavy tonnage edit); capital ships under owner ruling 3 by open, view, BV and print (#2518, #2611). Evidence: manual nightly 41961957398 on main `5ae130546` (Full E2E Suite on the production standalone server): `customizer-library-open.spec.ts` passed 52 of 52, including 16 of 16 family journeys, each of which edits a value, checks the recomputed figure, saves to SQLite, reloads, reopens and checks the printed value (spec lines 980-985; three journeys set an explicit `edit:`, the other five edit `original - 1`). The clone journey fails at both widths when the canonical check is disabled (CI run 41977074910 on #2781, 56 of 56). Tests: `e2e/customizer-library-open.spec.ts`, `src/__tests__/unit/utils/serialization/CustomUnitSerializer.test.ts` (#2791 round trip and invalid value), `src/stores/__tests__/useAerospaceStore.subType.test.ts` (#2793 store, saved record and reopen), `src/stores/__tests__/useProtoMechStore.tonnage.test.ts` (#2794 chassis switch), and the store-level save tests `src/components/customizer/tabs/__tests__/openFromLibrary.test.tsx`, `src/services/units/unitLoaderService/__tests__/aerospaceSave.test.tsx`, `smallUnitSave.test.tsx` and `infantrySave.test.tsx`; evidence: `_reports/2026-10-30/claude-coordinator/ledger/rows-4x/` (`HANDBACK.md`, `AUDIT.md`, `nightly/`, `clone/`, `pr2781/`).
  - Carried: Mixed IS/Clan tech outside mechs is not modelled (`AUDIT.md` F4, held for the owner), so nothing of it is lost on save. Combat snapshots omit the new `componentTechBases` field by design. Unallocated mech armor tonnage dropping on reopen matches upstream, because MTF stores per-location points only. Editor completeness, the placeholder tabs and the unmapped fields are row 4.1.
- [ ] 4.3 Populate/select the right record-sheet assets and verify location identities and figures against the same domain results. (`customizer-tabs`: Subtype workflow acceptance)
  - Partial #2990/#2992 render explicit ordinary/superheavy tripod and QuadVee
    crew identities, unequal skills and blank unassigned seats on Letter/A4,
    retaining native crew-global SPA overdraw/overflow. Proofs retain 40 tripod
    and 52 QuadVee SVG/PDF exports and unchanged controls. Three tripod preview
    comparisons retain four isolated outside-mask pixels each, classified by Root
    as a shared-preview raster artifact after zero-difference project-Chromium
    diagnostics. Receipts:
    `normal-work/P7-editors/tripod-native-crew/committed-proof.json` and
    `normal-work/P7-editors/quadvee-native-crew/committed-proof.json`. Authoring,
    persistence and other sheet gaps remain open.
  - #2986 removes only Dune Buggy's final unresolved-equipment sheet residual;
    all other residuals remain byte-identical. Seven vehicle `BV.source`
    residuals remain.
  - Partial SPA printing: #2957 selects the native single-pilot quad region
    (16 SVG/PDF cases); #2965 extends this to single-pilot LAM Letter/A4
    (24 actual canonical SVG/PDF exports, prior biped/quad output retained).
    Native long-list/token overflow is retained, not containment proof.
    Tripod/QuadVee crew-slot identity and other-family/field coverage remain
    open as below. Receipts: `normal-work/P7-editors/quad-native-spa/committed-proof.json`
    and `normal-work/P7-editors/lam-native-spa/integrated-proof.json`.
  - Carried print gap: tripod and QuadVee SPA output is deferred under the
    row 4.1 Root ruling until Q-PILOT supplies the pinned multicrew print-identity
    contract after #2948 slot completion, with P7 shared-type coordination.
    The one-pilot payload does not establish crew-slot identity. Single-pilot
    LAM printing may proceed without invented slots; all-unit/weapon/pilot
    quirk and SPA coverage remains required. No tick or closure is implied.
  - Open: this clause was out of date at tick 3. The catalog record-sheet suite (one file per family since #2679, BattleMechs in three parts) selects the template and compares sheet figures (BV, tonnage, armor, heat, equipment counts, SI, fuel and others) with the domain results for every indexed unit of six families (BattleMechs 4,263, vehicles 1,444, aerospace 620, battle armor 1,188, infantry 1,820, ProtoMechs 86), and #2611 added capital record-sheet preview and export (`capitalTemplated.test.ts`, `recordSheetFigures.test.ts`, `capitalRecordSheets.test.ts`). Re-run on main `ac64a3330` (`ledger/tick6/recordsheet-audit.log`: 9 suites, 12 tests, exit 0; `ledger/tick6/recordsheet-after/`), the snapshot records residuals only for vehicles: 7 sheets whose header BV differs from `calculateBattleValueForUnit` (`BV.source`; 181 at tick 5, before #2650) and 4 vehicles with unresolved equipment ids; the other five families have none, and the capital audit reports no differing sheet (255 complete, 139 defensive-only). The 7 are Air Car, Brunel Dump Truck (LRM), Buffalo BFFL Drone Bomb, Estevez MBT, Estevez MBT (Anti-Aircraft), HMRV Salvage Bed and J-37 Ordnance Transport, each with the store BV above the contract BV (`ledger/tick6/bvsource-paths.json`). The check is on figures; I did not verify that location identities are asserted for every family.
- [x] 4.4 Run real load/edit/save/reopen/print flows with narrow/wide layout, keyboard, long-label, loading and error-state evidence. (`customizer-tabs`: Subtype workflow acceptance) Proof: #2590 and #2511 (load, edit, save, reopen and print journeys at 390x844 and 1440x900, with the library loading state), #2781 (keyboard-only journeys for all eight editable families at 1440, and a long-label overlap check on the unit tab). Evidence: manual nightly 41961957398 on main `5ae130546`, 1,001 of 1,030 passed, 28 skipped. Its one failure is `campaign-economy-browser.spec.ts:382` (follow-up 97, not a customizer spec). All 71 customizer tests these rows cite passed first try: `customizer-library-open` 52, `customizer-data-flow` 5, `customizer-edit-recovery` 3, `customizer-equipment-catalog` 5 and `customizer-record-sheet-rendering` 6. Every editable family passed at both widths, and capital passed read-only open and print with no edit controls. Keyboard and long-label: CI run 41977074910 on #2781 head `41ca4fba3` passed all 56 tests of the spec. Mutants prove each new check: untruncated labels fail the overlap check in 3 of 3 sampled families. Error states: six cases pass in the nightly. The deleted saved reference and the draft-storage failure with retry were cited at tick 6. The other four are a recoverable failed catalog load, a library save failure that keeps the draft, a blocked print popup with Retry, and a failed canvas export with Retry. Evidence: `_reports/2026-10-30/claude-coordinator/ledger/rows-4x/`.
  - Carried: the error-state cases run on one unit, not on every family. The loading evidence is the library loading state; editor loading skeletons are row 4.1 (#2795). The keyboard journeys from #2781 had not yet run in a nightly at `5ae130546`; the next nightly is their first run on the standalone server. Correction to tick 6: all eight family journeys check a recomputed figure, not three, and the error-state evidence is the six cases above, not two.

## 5. Delivery and closure

- [x] 5.1 For each small PR, record test-first evidence, pinned-Java source citations and applicable construction/BV checks; require green CI at merge under the current policy. Per `OWNER-RULINGS-20261030.md`, "2026-11-03 (evening): tick-4 owner decisions", item 1, #2546 and #2586 are accepted on their integration-tip check runs. Done since #2648: the back-fill of the 48 PRs, the coordinator's 36-PR high-risk subset, the Opus and Sol reviews, and the fixes for all 22 findings. The owner accepted the four unshowable test-first exceptions under the [2026-11-06 row 5.1 ruling](E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/OWNER-RULINGS-20261030.md#2026-11-06-row-51-exceptions-owner-to-root): "Accept the 4".
  - Proof: the L-REV audit (`ledger/L-REV/`, 231 merged parity PRs, #2372 to #2609) identified 48 PRs missing test-first evidence or pinned-Java citations. L-REV2 back-filled them (`ledger/L-REV2/backfill/`): 19 back-filled, 25 not applicable, 4 could not show, now accepted as exceptions with their individual reasons below. The coordinator chose a 36-PR subset in four module groups (`L-REV2/SUBSET-DECISION.md`). Sol's review found 7 defects (all medium) and Opus's 15 (1 high); each is fixed in a merged follow-up PR (checked with `gh pr view` on 2026-11-05): Sol #2653, #2658, #2659, #2664, #2673, #2674, #2675; Opus #2694, #2695, #2696, #2700 (merged 2026-11-04T23:35Z, after the measured SHA), #2701, #2702, #2704, #2707, #2709 to #2713, plus the prerequisite and value fixes #2714, #2715, #2720 and #2724. The fix PRs were merged on green CI without a second Opus or Sol review. The L-REV2 red/green reproductions (12 PRs) are retrospective and do not show what the authors ran.
  - Accepted unshowable exception [#2464](https://github.com/SwiggitySwerve/MekStation/pull/2464): the PR's `test_blk_capital_converter.py` tests also pass on the integration first parent with the test-only overlay; parent and merge both exit 0, so no distinguishing red/green pair was shown. [Backfill evidence](E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/ledger/L-REV2/backfill/2464.md).
  - Accepted unshowable exception [#2467](https://github.com/SwiggitySwerve/MekStation/pull/2467): only narrows a test fixture type and adds a type-only import; assertions are unchanged. The protected mass-parity test was not overlaid, and no typecheck reproduction is claimed. [Backfill evidence](E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/ledger/L-REV2/backfill/2467.md).
  - Accepted unshowable exception [#2545](https://github.com/SwiggitySwerve/MekStation/pull/2545): only adds an explicit return type to `getVehicleBVMovement`, erased at runtime; no tests were added or changed, and no behavior regression is claimed. [Backfill evidence](E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/ledger/L-REV2/backfill/2545.md).
  - Accepted unshowable exception [#2547](https://github.com/SwiggitySwerve/MekStation/pull/2547): the PR's `mountedWeight.test.ts` tests also pass on the integration first parent with the test-only overlay; parent and merge each pass all 5 tests and exit 0, so no distinguishing red/green pair was shown. [Backfill evidence](E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/ledger/L-REV2/backfill/2547.md). Documentation and validation receipts: `ledger/row51-owner-exceptions/`.
- [ ] 5.2 Re-run the full source accounting and acceptance on the merged tree, reconcile all gaps, synchronize accepted specs and archive only after verified completion.
  - Ledger intake records merged #2982, #3003, #2983, #2985, #2991, #2986,
    #2990, #2992, #2993, #2994 and #3000 under their scoped rows, including the
    later ImportUnitDialog deletion. All checkbox states remain unchanged.
    No new corpus run, final acceptance, spec synchronization or archive is
    claimed.
  - Landed intake at `6621e87bf`: #2953 aggregate CI reporting caps, #2963's
    five-comparable-sample minimum for aggregate review and #2964's flake-register
    update improve reporting; they establish no speed, stability or goal closure.
    #2962 adds the keyboard initial-value readiness fix and preserves the wrong-value
    guard; the exact hosted race cause and subsequent stability remain unconfirmed.
    #2954/#2956, #2959, #2961/#2870 and #2957/#2965 are the partial import/source,
    ammo, validity and SPA slices recorded above. Every checkbox is unchanged.
    Merge identities, proof links, artifact hashes and remaining clauses for all
    13 PRs: `normal-work/P8-acceptance/landed-batch-2965/`.
  - #2958 packaging exclusion is Root-accepted from the exact-head hosted
    20,056-file inventory (run 42286593891, job 128129030390, artifact 13537523228)
    and Electron builder selectors, not a local build. Standalone+static
    278,668,997 B, web ZIP 85,779,408 B and installer 167,771,473 B meet the
    290/92/170 decimal-MB gates. Both failed local staging/build attempts remain
    recorded; no completed local build or new packaging run is claimed here.
    Policy hash `e129f62d3d2bed991a354e35563b98f299be8a4158f8e7ac5e0a13085b520cd4`;
    receipts: `normal-work/P1-reference/expected-policy/default-correction/FINAL-ACCEPTANCE.json`
    and `PACKAGING-CLOSURE.json`. The earlier `510631` policy/87,758-violation
    STOP remains historical failed evidence, not a waived or relabeled pass.
    The accepted full-cohort proof narrows only the row 1.3/3.4 provenance
    prerequisites; default blocking remains off, CI unchanged and row 3.4 open.
  - Accepted evidence intake at `4c5481001`: row 3.4 records #2951's scoped
    numerical proof with execution/base/merge identities kept separate. It is
    not the final merged-tree source/acceptance batch and does not narrow the
    carried runtime/settings or complete-construction obligations.
  - CI classification supplied by Root: #2951 merged at 12:39:44Z on the
    standing BV no-wait path, before PR run 42219240827 finished. Its PR rollup
    remains red: E2E (2/2) job 127897593926 failed at 12:47:20Z on the infantry
    keyboard-fill stale-prefix recurrence G6-041; aggregate job 127901135317
    reports that failure. Same-head run 42218681572 was a superseded cancellation.
    Root classifies this as the existing keyboard race, not a #2951 regression;
    the #2937 guard detects the wrong value but does not prevent the race.
    Main at merge `e86866ba2` is green from push run 42219382602 and scheduled
    run 42256355835 (both E2E shards and Lint and Test pass). No owner exception
    or green PR rollup is recorded. Current-main run 42277185296 at `4c5481001`
    is pending in this receipt; no pass is claimed. P7 owns keyboard remediation;
    the G6 register is not changed by this ledger update. Classification and
    receipt audit: `normal-work/P8-acceptance/landed-2951/`.
  - Open: depends on every other row, including every remaining clause of the
    10 other open rows listed above (row 3.3 reopened 2026-11-09). Acceptance
    checks 1, 3 and 4 remain open;
    historical aggregate BV equality does not discharge missing detailed terms,
    construction quantities, source semantics or connected workflow proof.
  - Follow-ups: reconcile all 115 items in `followups.md` against merged proof
    or an explicit owner deferral. Item 27 is owner-deferred; item 111 is only
    coordinator-deferred, so it does not satisfy that acceptance condition.
    G5 owns the central external status documents; P8 owns this task ledger.
  - Single deferral list (2026-11-09, `PARITY-PLAN` §11 "O4 deferral list").
    The owner deferred the 22 non-parity items below, none of which affects BV
    totals, construction validity, loading, editors or record sheets. For the
    items marked "residual", only the stated non-parity residual is deferred;
    the rest of each item is resolved or tracked elsewhere. FU-27 is carried
    here from its 2026-11-03 deferral (tick-4 owner decisions, item 3).

    | FU  | Deferred item                                                                | Reason                                                       |
    | --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
    | 5   | Cluster damage preview for UAC/RAC/LB-X                                      | Combat preview only; no BV, validity or loading term         |
    | 9   | One owner for the missile family                                             | Refactor; behaviour unchanged                                |
    | 15  | #2424/#2425 Low notes                                                        | Doc note in aerospace RULES.md                               |
    | 21  | CAMP-01 follow-ups from the #2429 reviews                                    | Comment in CAMP-01 test tooling                              |
    | 23  | UL-03 (#2431) leftovers (residual)                                           | Schema tie of `barRating`, unused engine-enum values, tests  |
    | 26  | #2434 (UL-16) exporter test gaps (residual)                                  | All fail closed                                              |
    | 27  | Date-dependent tests (carried, deferred 2026-11-03)                          | Outside the goal                                             |
    | 35  | #2449 (UL-07a prep) review items                                             | Schema 250 t bound; no pinned source fails                   |
    | 36  | #2448 (UL-08b) `.` subtest does not test the allowlist                       | Python test strengthening; code already refuses `.`          |
    | 37  | Vehicle unit-type aliases that MegaMek rejects                               | No pinned source uses them                                   |
    | 38  | #2450 (follow-up 33) review items (residual)                                 | Nested pins in the snapshot test                             |
    | 44  | Generator node test from #2444 is not in CI                                  | One-line CI change; no parity effect                         |
    | 52  | #2461 (UL-19 first term) notes                                               | Doc wording only                                             |
    | 73  | UL-14 (#2518) leftovers (residual)                                           | Temp worktree cleanup and PR-size note; capital stays read-only |
    | 87  | HVAC adjacency (from #2620)                                                  | No pinned source has that layout                             |
    | 88  | HAG cluster damage (from #2623)                                              | Needs a combat model; catalog damage stays 0                 |
    | 96  | Follow-up 17 closure notes (residual)                                        | MRM attack preview vs runner hit columns (combat logic)      |
    | 98  | 375 px settings overflow                                                     | Armor-diagram settings selector layout nit                   |
    | 105 | Stray scratch files                                                          | Outside the repo; delete by hand                             |
    | 107 | Untested `isOmniFixedOnly` category branch                                   | Test gap; production behaviour is correct                    |
    | 113 | FU-93 leftovers (residual)                                                   | LB-X ammo display names; Machine Gun (Light) unrouted by agreement |
    | 114 | Slow PDF export test                                                         | 17-26 s of a 30 s budget; flake risk, no parity effect       |
    | 115 | Half MG ammo bins hydrate with the wrong weapon family (from #2872)          | Combat runner family; BV pooling unaffected                  |

  - Not deferred: FU-84 (FrankenMek catalog files) is owner-approved for narrow
    regeneration (2026-11-09 ruling, `PARITY-PLAN` §11), limited to each file's
    structure block with a guarded BV proof, and is owned by the 3.1-b worker.
    FU-111 is still coordinator-deferred, owned by 2.1-b under the standing
    approval, so it does not satisfy the owner-deferral condition.
  - FU-97 (salvage roster bug) is closed with evidence; the fix is #2997 and
    #3004 (both merged 2026-11-07). `e2e/campaign-economy-browser.spec.ts:382`
    failed in the nightly Full E2E Suite (chromium) in runs 41961957398
    (2026-11-05, `workflow_dispatch`, head `5ae130546`), 42072283514
    (2026-11-05, `73b1d1646`), 42254293879 (2026-11-06, `e86866ba2`) and
    42386769747 (2026-11-07, `09fd1f54a`). It does not fail in run 42496894305
    (2026-11-08, head `59183c466`, job 128781151938), the first nightly
    containing both fixes: it is absent from that run's 11 failures (run
    totals 963 passed, 24 skipped, 11 failed). Ten of those 11 failures are a
    separate Wave 3 regression (ROADMAP D-11), not FU-97 and not unit data;
    `campaign-wizard-save-diagnostics` already failed on 2026-11-07.
  - CI acceptance is the PR checks, CAMP-01 and nightly Coverage Thresholds on
    main. The six pre-existing nightly Full E2E failures are owner-deferred
    under the 2026-10-31 ruling; that is not a waiver for other failures. The
    owner ruled on 2026-11-09 that the roadmap is not complete until a Full E2E
    run on main is green (ROADMAP D-11, owned by Coordinator 4); 5.2's final
    accounting links that green run. The accepted deployed Guard proof on `0b8ea746c6` establishes Phase G release,
    not fresh nightly or full parity acceptance (`phase-g/PHASE-G-COMPLETE.md`).
  - Next: after relevant integrations settle, perform one batched source
    accounting, fresh guarded conversion and all-family acceptance pass on the
    exact committed integrated head. Retain pins, oracle/source hashes,
    producer receipts, all 9,815 paths and seven-family counts, with detailed
    omissions separate from total/aggregate results. Domain owners must
    coordinate accepted spec synchronization; archive only after every
    acceptance criterion passes. Batch contract: `normal-work/P8-acceptance/`.
  - Tooling versions: installed OpenSpec 1.5.0 passes focused strict validation
    and all 238 items on both this main revision and the reconciliation.
    A separate cached 1.14.3 audit reports 7 omitted-scenario errors and
    153 passed/85 failed items, reproduced on unchanged main. The repository
    CI quality validator passes; no CLI version is pinned in the npm lockfile.
    Retain the newer-version diagnostics for coordinated sync/archive review,
    not as a demonstrated failure of the current CI gate. Exact binaries,
    commands and runtime: `normal-work/P8-acceptance/validator-identity.json`;
    newer-version baseline: `normal-work/P8-acceptance/spec-baseline-comparison.json`.
