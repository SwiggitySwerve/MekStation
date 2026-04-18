# Tasks: Add Per-Type Armor Diagrams

## 1. Shared Primitive

- [x] 1.1 Extract `ArmorPipRow` component from existing mech diagram (single row of N pips, filled/empty state)
- [x] 1.2 `ArmorLocationBlock` wrapper: label + current/max counter + pip row
- [ ] 1.3 Extract `<ArmorAllocationInput>` primitive (number input + spinner + max)
- [x] 1.4 Unit tests for the primitives

## 2. Diagram Selector

- [x] 2.1 Add `ArmorDiagramForType.tsx` that switches on `unit.type` and renders the correct per-type diagram
- [x] 2.2 Used by each per-type Armor tab component

## 3. Vehicle Armor Diagram

- [x] 3.1 Create `VehicleArmorDiagram.tsx` (replace existing scaffold if present)
- [x] 3.2 Render 4 base locations (Front, LeftSide, RightSide, Rear)
- [x] 3.3 Add Turret location when `vehicle.turretConfig !== 'None'`
- [x] 3.4 Add Rotor location when `motionType === 'VTOL'`
- [ ] 3.5 Add Chin Turret when `turretConfig === 'Chin'`
- [x] 3.6 Add Body location for support vehicles
- [x] 3.7 Per-location input wired to the vehicle store
- [x] 3.8 Auto-allocate button: distribute armor points per TM Table (40% front, 20% each side, 10% rear, remainder to turret)
- [ ] 3.9 Storybook story + snapshot test — DEFERRED (see PR #333)

## 4. Aerospace Armor Diagram

- [x] 4.1 Create `AerospaceArmorDiagram.tsx`
- [x] 4.2 Render 4 arcs: Nose, Left Wing, Right Wing, Aft
- [x] 4.3 Render SI (Structural Integrity) as a separate horizontal bar above the arcs
- [ ] 4.4 Per-arc capacity cap derived from tonnage × armor-per-ton
- [ ] 4.5 Auto-allocate: distribute evenly by default, respecting fighter vs small-craft caps
- [ ] 4.6 Storybook story + snapshot test — DEFERRED (see PR #333)

## 5. BattleArmor Pip Grid

- [x] 5.1 Create `BattleArmorPipGrid.tsx`
- [x] 5.2 Render N columns (one per trooper) × M pip rows
- [x] 5.3 Suit max armor pips derived from BA chassis (Light: 3, Medium: 7, Heavy: 11, Assault: 15 — TechManual)
- [x] 5.4 Per-trooper damage tracking stub (filled pips decrement on damage)
- [x] 5.5 Indicate which trooper is the squad leader if the chassis rule applies
- [ ] 5.6 Storybook story + snapshot test — DEFERRED (see PR #333)

## 6. Infantry Platoon Counter

- [x] 6.1 Create `InfantryPlatoonCounter.tsx`
- [x] 6.2 Show `trooperCount / maxTrooperCount` with large typography
- [x] 6.3 Color thresholds: green (>75%), yellow (25–75%), red (≤25%)
- [x] 6.4 Below counter: "No per-location armor" label + per-TM rule citation
- [ ] 6.5 Show platoon XP / morale if tracked by the infantry record
- [ ] 6.6 Storybook story + snapshot test — DEFERRED (see PR #333)

## 7. ProtoMech Armor Diagram

- [x] 7.1 Create `ProtoMechArmorDiagram.tsx`
- [x] 7.2 Render 5 locations (Head, Torso, LA, RA, Legs) — compact
- [x] 7.3 Add Main Gun location when main-gun designation is set
- [x] 7.4 Compact layout — sized to show 5 protos on one screen when displaying a full point
- [ ] 7.5 Armor per-location capped per ProtoMech weight table — approximated from tonnage pending add-protomech-construction
- [ ] 7.6 Storybook story + snapshot test — DEFERRED (see PR #333)

## 8. Wiring

- [x] 8.1 Each per-type `<Type>ArmorTab.tsx` consumes `<ArmorDiagramForType>` instead of scaffold
- [ ] 8.2 Remove placeholder diagrams (`VehicleDiagram.tsx`, `AerospaceDiagram.tsx`, `BattleArmorDiagram.tsx`) or convert them to re-export from new files

## 9. Accessibility

- [x] 9.1 Every location has an accessible label including location name + current/max
- [ ] 9.2 Keyboard navigation: arrows move between location inputs
- [ ] 9.3 Auto-allocate button has a confirm step if armor is currently non-default

## 10. Spec Compliance

- [x] 10.1 Every `### Requirement:` in the `armor-diagram` spec delta has a `#### Scenario:`
- [x] 10.2 `openspec validate add-per-type-armor-diagrams --strict` passes
