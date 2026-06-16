# Change: Add BattleMech Combat Validation Suite

## Why

Game-logic work is now broad enough that isolated behavior tests are not enough. BattleMech combat needs a catalog-driven validation suite that records every action, modifier, legality gate, source-truth reference, and unsupported gap so new feature slices cannot silently drift from Total Warfare / TechManual semantics or from the MegaMek / MekHQ behavior used as the project comparison point.

The current implementation has already started this pattern with `CombatValidationCatalog`, support-surface contract tests, and the dated combat source-truth audit. This OpenSpec change makes that workflow explicit: every combat feature slice SHALL update the active OpenSpec delta, the validation catalog, and executable evidence together.

## What Changes

- Add a `combat-resolution` delta for the BattleMech combat validation catalog.
- Require catalog entries to distinguish `integrated`, `partial`, and `unsupported` mechanics.
- Require every integrated mechanic to carry executable evidence and source-truth notes.
- Require every unsupported mechanic to remain visible until implemented, with no silent omissions.
- Add physical-attack legality coverage for push, charge, death from above, posture, elevation, facing, quirk, displacement, and physical weapon gates.
- Record the current headway: shared missing/destroyed/self/friendly/same-board/non-adjacent/evading-attacker/loading-unloading-cargo-attacker/transported-passenger/swarming/target-making-DFA/airborne-target/building-occupancy gates, explicit invalid physical hex target gates, push attacker/target Mek unit-type gates, push quad BattleMech rejection, push airborne-attacker rejection, push rear-flipped-arm rejection, push displacement-state/counter-push gates, explicit push building/fuel-tank rejection, explicit charge/DFA building and fuel-tank target rejection, charge standing-Mek target gates, charge non-Mek-to-infantry/ProtoMech target gates, charge elevation-overlap gates, charge target movement-complete/immobile gates, charge/DFA displacement-state gates, push no-arms, both-arms-present, same-elevation, attacker-not-prone, target-not-prone, target-directly-ahead, push-destination-valid, push arm-fired gate with runner weapon-location hydration, DFA mechanical jump booster movement-step rejection, DFA VTOL/WIGE elevation reach with explicit jump MP/elevation context plus combat motion type in eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection, DFA jump/prone/infantry-family-attacker/DropShip-target/target-inside-building gates, source-backed Stable kick/push-only PSR relief, source-backed Easy Pilot piloting-gated terrain and 20+ phase-damage PSR relief, source-backed Cramped Cockpit Small Pilot PSR exception, source-backed No Arms stand-up PSR penalty, source-checked Low Arms registry-only out-of-scope boundary, source-backed AMS mounted-arc filtering when `mountingArc` state is available, canonical `isRearMounted` equipment hydration into Front/Rear `mountingArc` state, and catalog contract coverage are now tracked.

## Expected Outcomes By Diff Area

- `openspec/` and `docs/audits/` SHALL explain the intended combat outcome for each feature family, the source-truth basis for integrated rows, and the unresolved gaps that must stay visible.
- `src/simulation/runner/` SHALL turn official catalog data and hydrated unit state into quick-sim combat behavior without silent static weapon, synthetic weapon, ammo, critical-slot, or lifecycle fallbacks.
- `src/utils/gameplay/` SHALL keep shared rule helpers, event-sourced session reducers, combat state hydration, damage, heat, PSR, to-hit, movement, and physical attack outcomes aligned with the catalog rows.
- `src/engine/` SHALL expose the same validation, invalidation, targetability, turn-rotation, and terminal-state behavior through the interactive engine path that the runner exercises.
- `src/components/gameplay/`, `src/lib/p2p/`, `src/lib/multiplayer/`, and `src/types/` SHALL preserve combat action intent through UI command, local event, wire payload, host routing, and replay payload boundaries.
- `src/simulation/ai/` and representative scenario tests SHALL prove AI/runner planning consumes the hydrated combat state instead of bypassing range, ammo, arcs, movement, or lifecycle validation.
- `scripts/validate-combat-suite.mjs` and the focused Jest suites SHALL enforce the three validation lanes: catalog contracts, behavior-class tests, and representative runner-vs-interactive integration.

## Non-Goals

- This change does not claim full BattleTech parity in one pass.
- This change does not replace the existing source-truth audit under `docs/audits/`.
- This change does not move construction-system validation into combat-resolution.
- This change does not treat MegaMek/MekHQ as a licensing source for copied code; it is used as a behavior reference and cross-check target.

## Resolved Decisions

- Remaining physical gates are promoted only when a bounded source-backed runtime slice exists; otherwise they stay as explicit unresolved rows in the machine-readable gap export. The old displacement/terrain/PSR promotion-order question is closed in favor of row-level blocker accounting.
- Catalog evidence requires row-level source references for every unresolved or integrated claim. Exact file/method/source anchors are required for new integrated behavior and blockers when available; existing rows may use stable source-family anchors until later tightening work needs line-level precision.
- Combat feature PRs SHALL run `npm run validate:combat`, which already includes the gap export and strict OpenSpec validation for this change. Broader CI adoption for every OpenSpec delta remains a repository policy decision outside this combat-validation archive.
