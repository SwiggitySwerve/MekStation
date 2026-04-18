# Change: Add Per-Type Armor Diagrams

## Why

The armor diagram is the centerpiece of the customizer's Armor tab. Mechs have an established 8-front-location + 3-rear-location diagram under `src/components/customizer/armor/ArmorDiagram.tsx`. Each non-mech type has fundamentally different armor geometry:

- **Vehicle**: 4 cardinal sides + optional Turret + optional Rotor (VTOL) + optional Chin Turret (VTOL) + optional Body (support)
- **Aerospace**: 4 arcs — Nose, Left Wing, Right Wing, Aft — no front/rear distinction
- **BattleArmor**: per-trooper armor pips (each of 4–6 troopers has its own armor pool)
- **Infantry**: NO per-location armor; a platoon-size counter replaces the diagram
- **ProtoMech**: 5 locations — Head, Torso, Left Arm, Right Arm, Legs + optional Main Gun

The scaffolds `VehicleDiagram.tsx`, `AerospaceDiagram.tsx`, `BattleArmorDiagram.tsx` exist but are placeholders. Without a real per-type diagram, the Armor tab can't render correctly for non-mechs, the validation UI can't highlight which location is over-allocated, and the auto-allocate button can't distribute points. This change delivers the diagrams.

## What Changes

- Add `src/components/customizer/armor/VehicleArmorDiagram.tsx` (or replace the existing placeholder) with:
  - 4-side SVG geometry + optional Turret / Rotor / Chin / Body locations
  - Conditional rendering based on `vehicle.motionType` (VTOL shows Rotor; support shows Body; etc.)
  - Per-location armor input with current/max indicators
  - Auto-allocate button honoring TechManual distribution tables
- Add `src/components/customizer/armor/AerospaceArmorDiagram.tsx`:
  - 4-arc SVG (Nose/LW/RW/Aft) with capital-ship–style arc labels
  - SI (Structural Integrity) bar separate from armor
  - Per-arc capacity enforced from aerospace-unit-system rules
- Add `src/components/customizer/armor/BattleArmorPipGrid.tsx`:
  - Per-trooper armor pip display (suit pips × N troopers)
  - Damage tracking model (pips clear as damage is taken — consumed by combat UI)
  - Modular weapon indicator alongside the pip grid
- Add `src/components/customizer/armor/InfantryPlatoonCounter.tsx`:
  - Large counter showing remaining/max troopers
  - Color-coded thresholds (green >75%, yellow >25%, red ≤25%)
  - "No per-location armor" label for clarity
- Add `src/components/customizer/armor/ProtoMechArmorDiagram.tsx`:
  - 5-location compact SVG (Head/Torso/LA/RA/Legs + optional Main Gun)
  - Compact layout to allow 1–5 protos on one screen when showing a point
- Extract a shared `<ArmorPipRow>` primitive so every diagram reuses the same pip rendering primitive
- Add a diagram-selector in the Armor tab that picks the correct component by `unit.type`
- Storybook stories per diagram + Jest snapshot tests per diagram

## Non-goals

- Armor allocation business logic (max points per location, distribution rules) — that lives in each `add-<type>-construction` proposal
- Animation / damage effects on the diagram during combat — Phase 7 art polish
- Printed record sheet armor rendering — `add-multi-type-record-sheet-export` territory
- Color theme customization — reuses existing theme tokens

## Dependencies

- **Requires**: `add-per-type-customizer-tabs` (needs the Armor tab to exist per type), each `add-<type>-construction` change (needs the per-location data model)
- **Required by**: `add-multi-type-record-sheet-export` (share armor geometry helpers where possible)
- **Phase 1 coupling**: none (customizer UI only)

## Ordering in Phase 6

Ship after customizer-tabs lands and in parallel with or after each type's construction proposal:

```
add-per-type-customizer-tabs       (Wave 0)
         │
         ├──► add-<type>-construction  (Wave 1+, one per type)
         │           │
         │           ▼
         └──► add-per-type-armor-diagrams  (can ship alongside or after each construction)
```

Agents can ship one diagram at a time (vehicle first, then aerospace, etc.) or all 5 in a single PR.

## Impact

- **Affected specs**: `armor-diagram` (ADDED: per-type diagram requirements, per-type geometry, shared primitives, diagram-selector)
- **Affected code**: `src/components/customizer/armor/*`, existing `Diagram.tsx` stubs in each per-type folder
- **New files**: 5 per-type diagram components, shared `ArmorPipRow`, diagram-selector, 5 Storybook stories, 5 test files
- **No schema change**
