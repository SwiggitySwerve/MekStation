# Change: Add Per-Type Customizer Tabs

## Why

Current customizer scaffolding under `src/components/customizer/` has sub-folders for every unit type (`vehicle/`, `aerospace/`, `battlearmor/`, `infantry/`, `protomech/`) but the tab sets are uneven and incomplete:

- **Vehicle**: has Structure / Armor / Turret / Equipment — reasonable, needs wiring to construction rules
- **Aerospace**: has Structure / Armor / Equipment — missing Velocity/Thrust, Fuel, Bomb Bay tabs
- **BattleArmor**: has Squad + Structure — missing Manipulators, Modular weapons, AP weapons, per-trooper armor
- **Infantry**: has Build only — missing Platoon composition, Primary/Secondary weapons, Field Gun, Specialization
- **ProtoMech**: has Structure only — missing Armor, Equipment, Main Gun, Glider mode

The construction proposals (`add-vehicle-construction` et al.) mention "wire into customizer tabs" but don't enumerate which tabs. Agents implementing those proposals will invent the tab sets ad-hoc, producing inconsistent UX. This change locks the tab architecture per type so every construction proposal has a clear UI contract.

## What Changes

- Lock the canonical tab set per unit type:
  - **Mech** (reference, unchanged): Overview / Structure / Armor / Equipment / Critical Slots / Preview / Fluff
  - **Vehicle**: Overview / Structure / Armor / Turret / Equipment / Preview / Fluff
  - **Aerospace**: Overview / Structure / Armor / Equipment / Velocity / Bombs / Preview / Fluff
  - **BattleArmor**: Overview / Chassis / Squad / Manipulators / Modular Weapons / AP Weapons / Jump/UMU / Preview / Fluff
  - **Infantry**: Overview / Platoon / Primary Weapon / Secondary Weapons / Field Guns / Specialization / Preview / Fluff
  - **ProtoMech**: Overview / Structure / Armor / Main Gun / Equipment / Glider / Preview / Fluff
- Add missing tab components for each type (see tasks)
- Extend `CustomizerTabs.tsx` / `UnitTypeRouter.tsx` to render the correct tab set based on `unit.type`
- Extract shared tab behaviors (tab state, routing, dirty tracking) into a `useCustomizerTabs` hook so per-type implementations stay thin
- Keep `Overview`, `Preview`, `Fluff` tabs SHARED across all types — only the middle tabs vary
- Add tab visibility predicates (e.g., Bomb Bay tab hidden on Conventional Fighter; Glider tab hidden on ProtoMechs that don't support glider rule)

## Non-goals

- The construction business logic inside each tab — that's each `add-<type>-construction` change's territory
- Armor diagram artwork (separate `add-per-type-armor-diagrams` change)
- Record sheet layout (separate `add-multi-type-record-sheet-export` change)
- Visual theming of tabs — reuses existing customizer tab styling

## Dependencies

- **Requires**: existing `multi-unit-tabs` spec and `UnitTypeRouter.tsx` scaffolding
- **Required by**: `add-vehicle-construction`, `add-aerospace-construction`, `add-battlearmor-construction`, `add-infantry-construction`, `add-protomech-construction` — each of those proposals assumes a set of tabs to wire into; this change defines them
- **Phase 5 coupling**: none; Phase 5 pilot SPA UI is on the pilot detail page, not the customizer

## Ordering in Phase 6

Ship BEFORE any construction proposal so the tab architecture exists when agents wire data flow. Specifically:

```
Wave 0: add-per-type-customizer-tabs        (THIS CHANGE — lands first)
Wave 1: add-vehicle-construction             (uses tabs)
Wave 2: add-aerospace-construction           (uses tabs)
... etc.
```

## Impact

- **Affected specs**: `multi-unit-tabs` (ADDED: canonical tab set per type, tab visibility rules, shared tab components)
- **Affected code**: `src/components/customizer/CustomizerWithRouter.tsx`, `UnitTypeRouter.tsx`, `UnitEditorWithRouting.tsx`, `tabs/CustomizerTabs.tsx`, `vehicle/`, `aerospace/`, `battlearmor/`, `infantry/`, `protomech/` sub-folders
- **New files** (per type, ~20 new `*Tab.tsx` placeholder components with signed contract that construction proposals will fill in): aerospace Velocity/Bombs, BA Manipulators/Modular/AP/JumpUMU, Infantry Platoon/Primary/Secondary/FieldGuns/Specialization, ProtoMech Armor/Equipment/MainGun/Glider
- **No schema change** — pure UI scaffolding
