# Tasks — Add Per-Type Customizer Overview

> Implementation shipped in PR #594. Tasks are recorded here for traceability;
> all are complete. The Final Verification Wave covers the delta merge.

## 1. Shared identity editor

- [x] 1.1 Add `NonMechIdentityPanel` — a store-free presentational editor for
  chassis / model / MUL ID / year / rules level / tech base (read-only) and an
  optional tonnage field.
- [x] 1.2 Sanitise inputs: MUL ID accepts digits and hyphen only and collapses
  empty input to the `-1` custom-unit sentinel; year parses to a positive
  integer.

## 2. Per-type wrappers

- [x] 2.1 Add `NonMechOverviewTabs` with five wrappers — `VehicleOverviewTab`,
  `AerospaceOverviewTab`, `BattleArmorOverviewTab`, `InfantryOverviewTab`,
  `ProtoMechOverviewTab` — each reading its contextual store.
- [x] 2.2 Each wrapper keeps the store `name` field in sync with `chassis` +
  `model` edits.
- [x] 2.3 Wrappers for tonnage-bearing types (Vehicle / Aerospace / ProtoMech)
  pass `onTonnageChange`; BattleArmor / Infantry do not.

## 3. Registry wiring

- [x] 3.1 Wire the five wrappers into the customizer type descriptor registry
  as each descriptor's `OverviewComponent`.
- [x] 3.2 Remove `NonMechOverviewPlaceholder`.
- [x] 3.3 Update `OverviewTabForType` doc comment to describe per-type dispatch.

## 4. Tests

- [x] 4.1 `NonMechIdentityPanel` unit suite — rendering branches, input
  sanitisation, read-only mode.
- [x] 4.2 `NonMechOverviewTabs` per-type integration suite — panel render,
  store write-back, name sync, tonnage visibility.
- [x] 4.3 Update `customizerTypeRegistry`, `OverviewTabForType`, and
  `nonMechCustomizerTabMount` suites for the new components.

## 5. Final Verification Wave

- [ ] 5.1 Merge the `customizer-tabs` MODIFIED delta into the source-of-truth
  spec so "Overview Tab Non-Mech Crash Guard" describes the shipped editor.
- [ ] 5.2 Archive this change.
