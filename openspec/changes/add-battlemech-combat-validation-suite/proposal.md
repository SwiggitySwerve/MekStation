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
- Record the current headway: shared missing/destroyed/self/friendly/same-board/non-adjacent/evading-attacker/loading-unloading-cargo-attacker/transported-passenger/swarming/target-making-DFA/airborne-target/building-occupancy gates, helper-level invalid physical hex target gates, push attacker/target Mek unit-type gates, push quad BattleMech rejection, push airborne-attacker rejection, push rear-flipped-arm rejection, push displacement-state/counter-push gates, helper-level push building/fuel-tank rejection, helper-level charge/DFA building and fuel-tank target rejection, charge standing-Mek target gates, charge non-Mek-to-infantry/ProtoMech target gates, charge elevation-overlap gates, charge target movement-complete/immobile gates, charge/DFA displacement-state gates, push no-arms, both-arms-present, same-elevation, attacker-not-prone, target-not-prone, target-directly-ahead, push-destination-valid, push arm-fired gate with runner weapon-location hydration, DFA mechanical jump booster movement-step rejection, DFA VTOL/WIGE elevation reach with explicit jump MP/elevation context plus combat motion type in eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection, DFA jump/prone/infantry-family-attacker/DropShip-target/target-inside-building gates, and catalog contract coverage are now tracked.

## Non-Goals

- This change does not claim full BattleTech parity in one pass.
- This change does not replace the existing source-truth audit under `docs/audits/`.
- This change does not move construction-system validation into combat-resolution.
- This change does not treat MegaMek/MekHQ as a licensing source for copied code; it is used as a behavior reference and cross-check target.

## Open Questions

- Which remaining unsupported physical gates should be promoted first: displacement-chain destruction, forbidden terrain, or pilot skill roll consequences?
- Should catalog evidence require exact source line anchors for every rule once the initial suite stabilizes?
- Should OpenSpec validation become a required CI check for every combat feature PR?
