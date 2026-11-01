# Execution ledger

The owner has authorized implementation. The latest all-family, data-first goal
supersedes the assessment pause. Each row needs actual evidence before closure;
small implementation PRs can discharge parts of a row without closing the rest.

## 1. Source and reference foundation

- [ ] 1.1 Implement deterministic pinned Git source inventory in `scripts/megameklab-conversion/`, including MTF/BLK/BFS, hashes, explicit other files and nonempty input errors. Test dirty-tree isolation and missing/invalid inputs. (`unit-services`: Immutable source inventory)
- [ ] 1.2 Extend the inventory with upstream-loaded family/configuration identities, archive members, load failures and separate unique-design counts. Reconcile every source entry without silent deduplication. (`mtf-parity-validation`: Complete source accounting)
- [ ] 1.3 Establish a compatible pinned MegaMek/MegaMekLab runtime and export loaded entities, verifier/BV terms and settings. Record reproducible commands/artifact hashes and source resolution errors. (`mtf-parity-validation`: Reproducible loaded-entity references)
- [ ] 1.4 Implement strict per-term comparison, zero/nonfinite/1%-boundary rejection and coverage failure tests; retain existing mech regression gates. (`battle-value-system`: Strict all-family numerical parity)

## 2. Source semantics and approved vehicle corrections

- [ ] 2.1 Add focused source-format deltas and failing fixtures for serialized engine/armor codes, technology flags, real subtypes, armor ordering and equipment qualifiers. Consolidate duplicate schema facts before changing output. (`unit-entity-model`: Faithful source-unit semantics)

  UL-06a covers vehicle source qualifiers in the converter and generated catalog
  contract, with six pinned source fixtures. UL-05 mirrors UL-04a's vehicle
  armor layouts, rejects invalid array lengths, includes 25 LargeSupportTanks
  and hands the 9 vehicle-directory FixedWingSupport sources to aerospace.
  Complete hydration, equipment qualifiers and row 3.1 remain open.
- [ ] 2.2 Implement installed vehicle engine rules and suspension in the owning modules and conversion/store callers; run affected BV and construction regressions and produce an in-memory data-impact report. (`battle-value-system`: Strict all-family numerical parity)
- [ ] 2.3 Implement controls, lift/dive and engine-specific heat sinks; make the true Tamerlane reference pass with independently correct terms. (`battle-value-system`: Strict all-family numerical parity)
  - Controls/lift slice: construction owner, explicit no-controls store context, validation quantities and reactive component accounting implemented; see `.omo/evidence/controls-lift/`. Heat-sink rules and source-tag-to-store propagation remain open; this row stays unchecked.
- [ ] 2.4 Correct shared flank rounding, turret removal/armor, dual-turret sheet mapping, placeholder mechanism weights and genuine Omni allowances. Resolve the obsolete generic turret-capacity spec with a focused delta. Base construction and post-motive-damage flank now round upward; the same rule's aerospace max-thrust and BattleMech run-MP floors and the canonical overview table's floor text remain open. (`unit-entity-model`: Faithful source-unit semantics)
  - Chin mechanism slice: the ordinary turret owner uses 10% for combat VTOL chin mass; test-first boundaries, validation and real-catalog budget composition are covered by the carried tests. Fresh pinned Java observations independently distinguish the former 5% rule. Generic capacity (the 10%-tonnage `maxWeight` rule), placeholder display/handler weights, explicit Omni allowances and publication gates remain open; this row stays unchecked.

- [ ] 2.5 Correct ProtoMech rating through the existing owner after separately verified consolidation; prove stages against pinned Java and cover chassis/reactive edits, exact inverse and movement aliases without claiming native loading or whole-unit parity. (`protomech-unit-system`: Engine Rating)
- [x] 2.6 Consolidate ProtoMech structure without changing outputs, then correct the shared rule, source/default/reactive consumers and printing topology. All 326 refactor observations are byte-identical; 488 synthetic cases and all 86 original sources match actual pinned Java for structure, explicit absent locations and isolated standard-structure BV terms. No unrelated source fields changed; all 10 construction-invalid designs remain invalid. Existing saves, equipment, complete BV and production editor round trips remain separate. (`protomech-unit-system`: Internal Structure)

- [ ] 2.7 Consolidate ProtoMech engine mass without changing either former rounding policy, then correct normal-engine mass against pinned Java, propagate it to loaded units and canonical projections, and retain invalid source ratings with unavailable mass and diagnostics. Complete mass/BV and editor persistence remain open. (`protomech-unit-system`: ProtoMech Engine Mass)

- [x] 2.8 Consolidate the three ProtoMech armor policies without behavior changes, then correct shared total/location limits, explicit allocation and live source diagnostics against pinned Java. All 582 cap observations match (496 synthetic, 86 originals); source fields and BV are unchanged and all 10 invalid designs remain invalid. Explicit allocations respect both caps and refresh BV; production editor/persistence, complete BV and partial-budget allocation remain open. (`protomech-unit-system`: ProtoMech Armor Limits)

- [ ] 2.9 Consolidate every derived ProtoMech running policy without changing outputs, then correct ordinary/explicit-booster running and walk display through the owner and all existing consumers. Compare actual Java observations and record source equipment gaps and changed local BV separately. Jump/caps, equipment identity, persistence and complete BV remain open. (`protomech-unit-system`: ProtoMech Derived Running Movement)

- [ ] 2.10 Derive native ProtoMek booster state from exact pinned equipment identities and visited source locations, preserving raw entries and structured syntax failures. Compare all 86 sources and actual Java alias/mount cases; retain explicit direct-editor export, equipment legality, cost and complete BV gaps. (`unit-services`: ProtoMek source booster equipment)

- [ ] 2.11 Consolidate the offensive speed exponent/rounding without behavior change, then use explicit Run for ProtoMek offensive BV and verify actual Java component/entity/source factors. Preserve source/export fields and saved movement; retain full equipment, defensive/chassis and complete BV gaps. (`battle-value-system`: ProtoMech Offensive BV and Main Gun)

- [ ] 2.12 Consolidate standard TMM thresholds, including the legacy validation raw-MP maximum without a jump bonus and the active BV script adapter with its inverse bracket minima, while preserving each caller contract, then correct ProtoMek/Glider defensive movement factors and verify native components, sources and store consumers. Preserve unrelated figures and saved movement; retain full-BV and production-flow gaps. (`battle-value-system`: ProtoMech Defensive BV)

- [ ] 2.13 Remove unsupported ProtoMech weight/chassis BV adjustments and fix Piloting at 5 through the shared skill owner; verify seeded native components, simple loaded entities and saved-cache consumers, preserving source/export fields and retaining full-source equipment/BV gaps. (`battle-value-system`: ProtoMech Offensive BV and Main Gun; ProtoMech Chassis Multiplier; ProtoMech Gunnery Adjustment)

- [ ] 2.14 Remove the unsupported ProtoMech explosive-equipment BV penalty; verify actual native stages for all 86 sources, preserve unrelated terms and saved caches, and retain full-equipment/BV gaps. (`battle-value-system`: ProtoMech Defensive BV)

- [ ] 2.15 Preserve Clan technology in pattern-derived equipment IDs through the existing prefix owner; compare all changed captured names against native registry identities, preserve ordinary Clan LB-X vehicle ammunition through the shared matching owner (also used by its audit), and retain explicit complete-equipment/BV gaps. (`equipment-services`: Clan identity in equipment pattern resolution)

- [ ] 2.16 Separate native ProtoMek SRM 1/3/5 identities from battle-armor catalog entries; verify pinned runtime fields and aliases, official loader eligibility, source weapon BV changes and preserved legacy records. (`equipment-services`: Distinct native ProtoMek SRM catalog identities)

- [ ] 2.17 Resolve nine native Clan laser/light-weapon identities through existing catalogs and mappings, verify represented fields against pinned Java, and measure source BV, combat-data and ammunition effects without claiming complete equipment parity. (`equipment-services`: Native Clan laser and light weapon catalog identities)

- [ ] 2.18 Separate native ProtoMek LRM 1-4 identities and correct twelve other LRM records using pinned runtime fields; verify official-loader eligibility, BV/MTF/combat consumers, local own-name compatibility through real BA/ProtoMech store writers and preserved source/ammo boundaries. (`equipment-services`: Native ProtoMek LRM catalog identities)

- [ ] 2.19 Consolidate cluster lookup/table copies with unchanged captures, then correct integer racks 1-20 against pinned Java and exercise shared combat and preview consumers. Ammo eligibility, complete ProtoMech combat and larger racks remain open. (`combat-resolution`: Native cluster hits for represented integer racks)

- [ ] 2.20 Consolidate repeated ammo classification/count checks and projection without behavior changes, then require explicit usable ammo state for known missiles with unspecified capacity; prove AI, preview, runner firing/depletion and ordinary controls. Pin the inherited engine/interactive-session display-name refusal separately from successful AI selection. Session firing identity, source identity/quantity/topology, implicit ammo and full BV remain open. (`ammo-tracking`: Unknown missile capacity requires explicit ammunition state)

- [ ] 2.21 Preserve known missile category independently of capacity metadata at the weapon attack boundary; verify its Gunnery Specialist to-hit effect through real hydration and isolate category-dependent targets in mixed volleys through declaration and serialized resolution, preserving shared context and legacy fallbacks. Complete native categories, multi-SPA precedence, ID/name-dependent volley effects and category propagation through tactical previews and committed human interactive attacks remain open. (`spa-combat-integration`: Gunnery SPA — Gunnery Specialist)

- [ ] 2.22 Consolidate offensive ammo grouping/cap arithmetic across shared, ProtoMech and aerospace owners while preserving their distinct policies and all source outputs; then connect native ammunition identity, effective quantities and grouping with independent numerical proof. Defensive caps and incomplete native ammunition receive no parity credit. (`battle-value-system`: Offensive ammunition cap ownership)

- [ ] 2.23 Resolve ammunition within the existing BV catalog owner using its source collection, preserve generic/MTF lookup and reject weapon-only ammo identities through real consumers. Verify collisions, explicit custom context/reset, all captured lookup effects and all-family regression outputs. Native aliases, quantities, grouping, mount topology and full BV remain open. (`equipment-services`: Ammunition context in BV catalog resolution)

- [ ] 2.24 Consolidate the total-to-projectile missile damage conversion and missile rack identification without behavior change, then correct expected-damage/variance previews and their selector/forecast consumers against pinned MegaMek damage-per-missile semantics. Unchanged runner and selected-AMS outputs are proven for every hydrated cluster/Streak launcher; hydrated LRM/SRM/ATM/MML/Streak previews, and native ProtoMek LRM previews, now equal the runner's resolution. UAC/RAC rate-of-fire and LB-X cluster/slug previews, MRM and other situational cluster modifiers in previews, ATM's built-in +2 cluster modifier (`ATMHandler.java:236-250`, in neither the runner nor the previews), MegaMek's own MRM 30/40 cluster rows (racks above 20 snap to the 20 column), the MML LRM/SRM mode, crit-probability location grouping, the independent damage-times-hit-probability estimators (per-weapon to-hit projection, volley ledger, AI coordinator), which assume every missile lands and, on the demo route, still read the unconverted per-missile display strings; ATM extended-range and high-explosive munition damage per missile (hydrated as standard 2); damage-per-hit callers, source BV and complete ProtoMech combat remain open. (`combat-resolution`: Native cluster hits for represented integer racks; `to-hit-resolution`: Missile damage previews use per-projectile damage)

- [ ] 2.25 Round base BattleMech run MP upward in the construction calculation service that feeds customizer Battle Value, verified against pinned MegaMek and the catalog BV reference. MASC, supercharger, TSM, hardened-armor and shield movement in the customizer path (odd-walk hardened-armor BattleMechs now read run MP one above MegaMek), and the remaining floor text in the canonical movement-system, hardened-armor-combat and README specs, remain open. (`movement-system`: Walk/Run MP Calculation)

- [ ] 2.26 Consolidate the aerospace max thrust derivation across BLK basics, handlers, defaults, store actions and templates without behavior change, then round it upward against pinned MegaMek `Entity.getRunMP` for every airborne aerospace family and propagate it to the aerospace BV adapter inputs. Compare actual Java walk/run MP over the aerospace sources first; the `BlkParserService` aerospace parse result, JumpShip/space-station station-keeping thrust, aerospace BV formula parity and catalogs remain open. (`aerospace-unit-system`: Aerospace max thrust ownership)

## 3. Complete typed data flows

- [ ] 3.03 Share the existing ammunition-bin projection without changing its output, then forward live counts through the selector/forecast consumers and verify ammo-only updates; retain unknown-capacity readiness, active-composer and native ammunition gaps. (`to-hit-resolution`: Ammunition counts in preview consumers)

- [ ] 3.02 Extract ProtoMek equipment syntax without changing outputs, then retain parsed block/entry identity, explicit shots/size/rear-prefix and diagnostics through handler/store projections, saved-state loading and bounded BLK reload. Verify actual native shot/size observations; retain resolved identity, Body topology, general serialization and full equipment/BV gaps. (`unit-services`: ProtoMek equipment source syntax)

- [ ] 3.01 Consolidate the ProtoMek BLK equipment projection without changing output, then reject flag/emitted-booster disagreement and unrepresentable equipment text without content or input mutation. Verify existing source export bytes and actual Java reload; production mount editing, arbitrary saved-flank export, complete equipment and BV remain open. (`unit-services`: ProtoMek booster export integrity)

- [ ] 3.0 Extend/consolidate existing schema ownership into a documented portable versioned design contract, explicit units/identities/extensions, migrations, examples and independent-consumer conformance tests; keep legacy syntax in adapters. (`unit-entity-model`: Portable versioned unit documents)
- [ ] 3.1 Extend existing schemas, family handlers and validators for every inventoried construction family; include invalid-but-loadable designs with explicit diagnostics and preserve unsupported records during rollout. (`unit-entity-model`: Faithful source-unit semantics)
  - [x] 3.1a Separate VTOL/SmallCraft BLK source loading from construction limits, retain original values and existing validation diagnostics, and reject unusable numeric fields. Verified all 170 pinned rows by source index/path/blob/SHA-256: 160 to 170 loaded, all 10 recovered rows construction-invalid, existing successful data and validation unchanged except unit diagnostic fields; 317 focused handler/parser/construction/BV assertions pass. This closes only this boundary slice; the all-family row, numerical parity and round trips remain open. (`unit-services`: VTOL and SmallCraft source loading diagnostics)
- [ ] 3.2 Connect browser/Node canonical discovery and direct source imports to the same domain contract; correct field/discriminator mismatches at the boundary. (`unit-services`: Family-aware loading and persistence)
  - [x] 3.2a Native ProtoMek BLK projection: all 86 pinned sources load with chassis, base movement/rating, declared rules level, armor locations and main-gun topology equal to actual pinned Java. All 86 scoped exports reload in Java with those fields unchanged; the test adapter is not a production import-to-store path. Existing construction diagnostics mark 10 designs invalid. At that slice's head all 86 retained internal-structure mismatches, subsequently corrected by 2.6. Equipment resolution, construction-rule fidelity, persistence and complete BV remain open. (`unit-services`: Native ProtoMek source projection)
- [ ] 3.3 Prove semantic serialization/save/reload for each subtype, with multiplicity, topology and custom/source identities preserved. (`mtf-parity-validation`: All-family semantic round trips)
- [ ] 3.4 Run complete per-family construction/BV comparisons against matched references. Record per-unit and component differences, upstream failures and justified inapplicable metrics. (`battle-value-system`: Strict all-family numerical parity)
- [ ] 3.5 Prepare catalog impact and reviewable generation commands; obtain the owner's required approval before vehicle catalog regeneration, then validate generated data and consumer coverage. (`unit-services`: Family-aware loading and persistence)

## 4. Forms, layouts and connected workflows after data readiness

- [ ] 4.1 Map upstream editor fields to local family descriptors; add correct forms, loading skeletons and location diagrams without fallback to unrelated editors. (`customizer-tabs`: Data-ready subtype editors)
- [ ] 4.2 Wire edits to domain calculations/validation and persist them through save/reopen for every family; retain canonical clone protection. (`customizer-tabs`: Data-ready subtype editors)
- [ ] 4.3 Populate/select the right record-sheet assets and verify location identities and figures against the same domain results. (`customizer-tabs`: Subtype workflow acceptance)
- [ ] 4.4 Run real load/edit/save/reopen/print flows with narrow/wide layout, keyboard, long-label, loading and error-state evidence. (`customizer-tabs`: Subtype workflow acceptance)

## 5. Delivery and closure

- [ ] 5.1 For each small PR, record test-first evidence, source citations, applicable construction/BV checks and exact-head Opus/Sol reviews; merge only green reviewed heads.
- [ ] 5.2 Re-run the full source accounting and acceptance on the merged tree, reconcile all gaps, synchronize accepted specs and archive only after verified completion.
