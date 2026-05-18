# Add Per-Type Customizer Overview

## Why

The change `wire-non-mech-customizer-preview` shipped a deliberate placeholder for
the non-mech Overview tab and **named this change as the follow-up**:

> A full per-type Overview editor is out of scope. Non-mech Overview gets only a
> non-crashing graceful panel. A full per-type Overview editor is named as a
> follow-up change (`add-per-type-customizer-overview`).

That follow-up has now shipped (PR #594) — every non-mech customizer
(Vehicle / VTOL / Support Vehicle / Aerospace / Conventional Fighter / Battle
Armor / Infantry / ProtoMech) renders a real Overview editor instead of the
"Overview editor not yet available" placeholder.

This change records that work in OpenSpec. The source-of-truth `customizer-tabs`
spec still carries the **"Overview Tab Non-Mech Crash Guard"** requirement, whose
scenario "Non-mech Overview renders a graceful placeholder" no longer describes
the shipped behaviour — the spec has drifted from the code. This change corrects
that drift.

This is a **spec-sync change**: the implementation already merged (PR #594); the
tasks below are bookkeeping for already-completed work plus the delta merge.

## What Changes

- A shared, store-free `NonMechIdentityPanel` renders the unit-identity surface
  every non-mech store exposes: chassis, model, MUL ID, year, rules level, tech
  base (read-only), and an optional tonnage field.
- Five thin per-type wrappers (`VehicleOverviewTab`, `AerospaceOverviewTab`,
  `BattleArmorOverviewTab`, `InfantryOverviewTab`, `ProtoMechOverviewTab`) read
  their contextual store and render the shared panel, keeping the store `name`
  field in sync with `chassis` + `model` edits.
- `OverviewTabForType` dispatches each non-mech `UnitType` to its per-type
  wrapper through the customizer type descriptor registry; the BattleMech branch
  is unchanged.
- The `NonMechOverviewPlaceholder` component is removed.

## Non-Goals

- **Editable tech base for non-mech types.** Only the BattleArmor and Infantry
  stores expose a `setTechBase` action; the Vehicle / Aerospace / ProtoMech
  stores do not. Tech base is rendered read-only across all five families.
  Editable non-mech tech base is a separate concern.
- **No changes to the mech Overview editor.** The BattleMech branch of
  `OverviewTabForType` is behaviour-preserving.
- **No new per-type store fields.** The editor reads and writes only the
  identity fields and `set*` actions every non-mech store already exposes.

## Affected Specs

- `customizer-tabs` — MODIFIED: the "Overview Tab Non-Mech Crash Guard"
  requirement is updated — the non-mech Overview tab now renders a real per-type
  identity editor, not a placeholder. It remains crash-safe.

## Test Strategy

- Infrastructure: exists — Jest + React Testing Library (`@swc/jest`).
- Tests: shipped with PR #594 — a `NonMechIdentityPanel` unit suite, a
  `NonMechOverviewTabs` per-type integration suite (panel render, store
  write-back, name sync, tonnage visibility), and updates to the
  `customizerTypeRegistry`, `OverviewTabForType`, and
  `nonMechCustomizerTabMount` suites. 136 tests pass across the affected suites.
