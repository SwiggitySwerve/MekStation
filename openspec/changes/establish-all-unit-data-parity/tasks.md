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
- [ ] 2.2 Implement installed vehicle engine rules and suspension in the owning modules and conversion/store callers; run affected BV and construction regressions and produce an in-memory data-impact report. (`battle-value-system`: Strict all-family numerical parity)
- [ ] 2.3 Implement controls, lift/dive and engine-specific heat sinks; make the true Tamerlane reference pass with independently correct terms. (`battle-value-system`: Strict all-family numerical parity)
  - Controls/lift slice: construction owner, explicit no-controls store context, validation quantities and reactive component accounting implemented; see `.omo/evidence/controls-lift/`. Heat-sink rules and source-tag-to-store propagation remain open; this row stays unchecked.
- [ ] 2.4 Correct shared flank rounding, turret removal/armor, dual-turret sheet mapping, placeholder mechanism weights and genuine Omni allowances. Resolve the obsolete generic turret-capacity spec with a focused delta. (`unit-entity-model`: Faithful source-unit semantics)

- [ ] 2.5 Correct ProtoMech rating through the existing owner after separately verified consolidation; prove stages against pinned Java and cover chassis/reactive edits, exact inverse and movement aliases without claiming native loading or whole-unit parity. (`protomech-unit-system`: Engine Rating)

## 3. Complete typed data flows

- [ ] 3.0 Extend/consolidate existing schema ownership into a documented portable versioned design contract, explicit units/identities/extensions, migrations, examples and independent-consumer conformance tests; keep legacy syntax in adapters. (`unit-entity-model`: Portable versioned unit documents)
- [ ] 3.1 Extend existing schemas, family handlers and validators for every inventoried construction family; include invalid-but-loadable designs with explicit diagnostics and preserve unsupported records during rollout. (`unit-entity-model`: Faithful source-unit semantics)
  - [x] 3.1a Separate VTOL/SmallCraft BLK source loading from construction limits, retain original values and existing validation diagnostics, and reject unusable numeric fields. Verified all 170 pinned rows by source index/path/blob/SHA-256: 160 to 170 loaded, all 10 recovered rows construction-invalid, existing successful data and validation unchanged except unit diagnostic fields; 317 focused handler/parser/construction/BV assertions pass. This closes only this boundary slice; the all-family row, numerical parity and round trips remain open. (`unit-services`: VTOL and SmallCraft source loading diagnostics)
- [ ] 3.2 Connect browser/Node canonical discovery and direct source imports to the same domain contract; correct field/discriminator mismatches at the boundary. (`unit-services`: Family-aware loading and persistence)
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
