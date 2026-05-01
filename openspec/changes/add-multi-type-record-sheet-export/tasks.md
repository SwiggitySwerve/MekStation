# Tasks: Add Multi-Type Record Sheet Export

## 1. Data Model

- [x] 1.1 Extend `IRecordSheetData` as a discriminated union tagged on `unitType: 'mech' | 'vehicle' | 'aerospace' | 'battlearmor' | 'infantry' | 'protomech'`
- [x] 1.2 Rename the existing mech payload to `IMechRecordSheetData`
- [x] 1.3 Add `IVehicleRecordSheetData` with: motionType, crew, turretConfig, armor per location (6–8 locations), equipment per location, BAR rating (optional)
- [x] 1.4 Add `IAerospaceRecordSheetData` with: SI (structural integrity), fuel, thrust/velocity caps, heat sinks, armor per arc (Nose/LW/RW/Aft), equipment per arc, bomb bay
- [x] 1.5 Add `IBattleArmorRecordSheetData` with: squad size, per-trooper armor pips, manipulators, modular weapon mounts, AP weapons, UMU/jump/VTOL
- [x] 1.6 Add `IInfantryRecordSheetData` with: platoon size, motive type, primary weapon, secondary weapons (AP ratio), field gun block (if any), specialization
- [x] 1.7 Add `IProtoMechRecordSheetData` with: 5 locations (Head/Torso/LeftArm/RightArm/Legs/MainGun), main gun designation, point composition (1–5 protos per point), UMU/glider flags
- [x] 1.8 Zod schemas for each variant

## 2. Service Dispatch

- [x] 2.1 `RecordSheetService.extractData(unit)` dispatches on `unit.type` to type-specific `extract<Type>Data(unit)` extractors
- [x] 2.2 Each extractor lives in its own module under `src/services/printing/recordsheet/` (co-located with existing mech extractor)
- [x] 2.3 Unknown unit types throw `UnsupportedUnitTypeError`

## 3. Vehicle Record Sheet

- [x] 3.1 Add `vehicleRenderer.ts` in `svgRecordSheetRenderer/`
- [x] 3.2 Render 6–8 armor locations (Front/LSide/RSide/Rear/Turret/(Rotor)/(Chin)/(Body)) with correct geometry
- [x] 3.3 Render motive table (cruise/flank MP) + motion type badge
- [x] 3.4 Render crew block: driver, gunner, commander (as applicable)
- [x] 3.5 Render turret weapons separately from hull weapons
- [x] 3.6 Render BAR rating for support vehicles
- [ ] 3.7 Snapshot test with a representative 50t tracked tank fixture

## 4. Aerospace Record Sheet

- [x] 4.1 Add `aerospaceRenderer.ts`
- [x] 4.2 Render 4-arc armor diagram (Nose/LW/RW/Aft) + SI bar
- [x] 4.3 Render heat chart (aerospace uses different thresholds than mechs)
- [x] 4.4 Render thrust/velocity table
- [x] 4.5 Render fuel track
- [x] 4.6 Render bomb bay slots if present
- [x] 4.7 Render pilot block (gunnery + piloting, edge)
- [ ] 4.8 Snapshot test with a Shilone and a Stuka fixture

## 5. BattleArmor Record Sheet

- [x] 5.1 Add `battleArmorRenderer.ts`
- [x] 5.2 Render per-trooper armor pip grid (4–6 troopers × per-suit pips)
- [x] 5.3 Render modular weapon mounts (selected weapon shown)
- [x] 5.4 Render AP (anti-personnel) weapons
- [x] 5.5 Render manipulator type per arm
- [x] 5.6 Render jump/UMU/VTOL jets
- [x] 5.7 Render per-suit pilot block (gunnery + anti-mech skill)
- [ ] 5.8 Snapshot test with an Elemental and a Kage fixture

## 6. Infantry Record Sheet

- [x] 6.1 Add `infantryRenderer.ts`
- [x] 6.2 Render platoon size counter (troopers alive / max)
- [x] 6.3 Render primary weapon stats (damage, range, ammo if applicable)
- [x] 6.4 Render secondary weapons block (AP weapons, ratio)
- [x] 6.5 Render field gun block (if present — 1 gun per 7 men rule)
- [x] 6.6 Render motive type (Foot / Motorized / Jump / Mechanized / Beast)
- [x] 6.7 Render specialization badge (anti-mech / marine / scuba / mountain / xct)
- [ ] 6.8 Snapshot test with a foot rifle platoon and a marine jump platoon fixture

## 7. ProtoMech Record Sheet

- [x] 7.1 Add `protoMechRenderer.ts`
- [x] 7.2 Render 5-location armor diagram (Head/Torso/LA/RA/Legs/(MainGun))
- [x] 7.3 Render main gun designation and ammo
- [x] 7.4 Render point composition (up to 5 protos in one sheet)
- [x] 7.5 Render UMU/glider flags
- [x] 7.6 Render point pilot block
- [ ] 7.7 Snapshot test with a Roc and a Minotaur point fixture

## 8. Integration

- [x] 8.1 Existing `/print/[id]` page routes all unit types through the extended `RecordSheetService`
- [ ] 8.2 Existing `recordsheet/spaSection.ts` (Phase 5) is called from every per-type renderer at the appropriate pilot-area coordinate
- [x] 8.3 `renderer.ts` top-level dispatch picks the per-type renderer by `data.unitType`

## 9. Spec Compliance

- [x] 9.1 Every `### Requirement:` in the `record-sheet-export` spec delta has a `#### Scenario:`
- [x] 9.2 `openspec validate add-multi-type-record-sheet-export --strict` passes
