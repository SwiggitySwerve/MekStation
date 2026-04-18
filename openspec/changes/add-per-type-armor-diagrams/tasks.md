# Tasks: Add Per-Type Armor Diagrams

## 1. Shared Primitive

- [ ] 1.1 Extract `ArmorPipRow` component from existing mech diagram (single row of N pips, filled/empty state)
- [ ] 1.2 `ArmorLocationBlock` wrapper: label + current/max counter + pip row
- [ ] 1.3 Extract `<ArmorAllocationInput>` primitive (number input + spinner + max)
- [ ] 1.4 Unit tests for the primitives

## 2. Diagram Selector

- [ ] 2.1 Add `ArmorDiagramForType.tsx` that switches on `unit.type` and renders the correct per-type diagram
- [ ] 2.2 Used by each per-type Armor tab component

## 3. Vehicle Armor Diagram

- [ ] 3.1 Create `VehicleArmorDiagram.tsx` (replace existing scaffold if present)
- [ ] 3.2 Render 4 base locations (Front, LeftSide, RightSide, Rear)
- [ ] 3.3 Add Turret location when `vehicle.turretConfig !== 'None'`
- [ ] 3.4 Add Rotor location when `motionType === 'VTOL'`
- [ ] 3.5 Add Chin Turret when `turretConfig === 'Chin'`
- [ ] 3.6 Add Body location for support vehicles
- [ ] 3.7 Per-location input wired to the vehicle store
- [ ] 3.8 Auto-allocate button: distribute armor points per TM Table (40% front, 20% each side, 10% rear, remainder to turret)
- [ ] 3.9 Storybook story + snapshot test

## 4. Aerospace Armor Diagram

- [ ] 4.1 Create `AerospaceArmorDiagram.tsx`
- [ ] 4.2 Render 4 arcs: Nose, Left Wing, Right Wing, Aft
- [ ] 4.3 Render SI (Structural Integrity) as a separate horizontal bar above the arcs
- [ ] 4.4 Per-arc capacity cap derived from tonnage × armor-per-ton
- [ ] 4.5 Auto-allocate: distribute evenly by default, respecting fighter vs small-craft caps
- [ ] 4.6 Storybook story + snapshot test

## 5. BattleArmor Pip Grid

- [ ] 5.1 Create `BattleArmorPipGrid.tsx`
- [ ] 5.2 Render N columns (one per trooper) × M pip rows
- [ ] 5.3 Suit max armor pips derived from BA chassis (Light: 3, Medium: 7, Heavy: 11, Assault: 15 — TechManual)
- [ ] 5.4 Per-trooper damage tracking stub (filled pips decrement on damage)
- [ ] 5.5 Indicate which trooper is the squad leader if the chassis rule applies
- [ ] 5.6 Storybook story + snapshot test

## 6. Infantry Platoon Counter

- [ ] 6.1 Create `InfantryPlatoonCounter.tsx`
- [ ] 6.2 Show `trooperCount / maxTrooperCount` with large typography
- [ ] 6.3 Color thresholds: green (>75%), yellow (25–75%), red (≤25%)
- [ ] 6.4 Below counter: "No per-location armor" label + per-TM rule citation
- [ ] 6.5 Show platoon XP / morale if tracked by the infantry record
- [ ] 6.6 Storybook story + snapshot test

## 7. ProtoMech Armor Diagram

- [ ] 7.1 Create `ProtoMechArmorDiagram.tsx`
- [ ] 7.2 Render 5 locations (Head, Torso, LA, RA, Legs) — compact
- [ ] 7.3 Add Main Gun location when main-gun designation is set
- [ ] 7.4 Compact layout — sized to show 5 protos on one screen when displaying a full point
- [ ] 7.5 Armor per-location capped per ProtoMech weight table
- [ ] 7.6 Storybook story + snapshot test

## 8. Wiring

- [ ] 8.1 Each per-type `<Type>ArmorTab.tsx` consumes `<ArmorDiagramForType>` instead of scaffold
- [ ] 8.2 Remove placeholder diagrams (`VehicleDiagram.tsx`, `AerospaceDiagram.tsx`, `BattleArmorDiagram.tsx`) or convert them to re-export from new files

## 9. Accessibility

- [ ] 9.1 Every location has an accessible label including location name + current/max
- [ ] 9.2 Keyboard navigation: arrows move between location inputs
- [ ] 9.3 Auto-allocate button has a confirm step if armor is currently non-default

## 10. Spec Compliance

- [ ] 10.1 Every `### Requirement:` in the `armor-diagram` spec delta has a `#### Scenario:`
- [ ] 10.2 `openspec validate add-per-type-armor-diagrams --strict` passes
