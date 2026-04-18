# Tasks: Add Multi-Type Record Sheet Export

## 1. Data Model

- [ ] 1.1 Extend `IRecordSheetData` as a discriminated union tagged on `unitType: 'mech' | 'vehicle' | 'aerospace' | 'battlearmor' | 'infantry' | 'protomech'`
- [ ] 1.2 Rename the existing mech payload to `IMechRecordSheetData`
- [ ] 1.3 Add `IVehicleRecordSheetData` with: motionType, crew, turretConfig, armor per location (6–8 locations), equipment per location, BAR rating (optional)
- [ ] 1.4 Add `IAerospaceRecordSheetData` with: SI (structural integrity), fuel, thrust/velocity caps, heat sinks, armor per arc (Nose/LW/RW/Aft), equipment per arc, bomb bay
- [ ] 1.5 Add `IBattleArmorRecordSheetData` with: squad size, per-trooper armor pips, manipulators, modular weapon mounts, AP weapons, UMU/jump/VTOL
- [ ] 1.6 Add `IInfantryRecordSheetData` with: platoon size, motive type, primary weapon, secondary weapons (AP ratio), field gun block (if any), specialization
- [ ] 1.7 Add `IProtoMechRecordSheetData` with: 5 locations (Head/Torso/LeftArm/RightArm/Legs/MainGun), main gun designation, point composition (1–5 protos per point), UMU/glider flags
- [ ] 1.8 Zod schemas for each variant

## 2. Service Dispatch

- [ ] 2.1 `RecordSheetService.extractData(unit)` dispatches on `unit.type` to type-specific `extract<Type>Data(unit)` extractors
- [ ] 2.2 Each extractor lives in its own module under `src/services/printing/recordsheet/` (co-located with existing mech extractor)
- [ ] 2.3 Unknown unit types throw `UnsupportedUnitTypeError`

## 3. Vehicle Record Sheet

- [ ] 3.1 Add `vehicleRenderer.ts` in `svgRecordSheetRenderer/`
- [ ] 3.2 Render 6–8 armor locations (Front/LSide/RSide/Rear/Turret/(Rotor)/(Chin)/(Body)) with correct geometry
- [ ] 3.3 Render motive table (cruise/flank MP) + motion type badge
- [ ] 3.4 Render crew block: driver, gunner, commander (as applicable)
- [ ] 3.5 Render turret weapons separately from hull weapons
- [ ] 3.6 Render BAR rating for support vehicles
- [ ] 3.7 Snapshot test with a representative 50t tracked tank fixture

## 4. Aerospace Record Sheet

- [ ] 4.1 Add `aerospaceRenderer.ts`
- [ ] 4.2 Render 4-arc armor diagram (Nose/LW/RW/Aft) + SI bar
- [ ] 4.3 Render heat chart (aerospace uses different thresholds than mechs)
- [ ] 4.4 Render thrust/velocity table
- [ ] 4.5 Render fuel track
- [ ] 4.6 Render bomb bay slots if present
- [ ] 4.7 Render pilot block (gunnery + piloting, edge)
- [ ] 4.8 Snapshot test with a Shilone and a Stuka fixture

## 5. BattleArmor Record Sheet

- [ ] 5.1 Add `battleArmorRenderer.ts`
- [ ] 5.2 Render per-trooper armor pip grid (4–6 troopers × per-suit pips)
- [ ] 5.3 Render modular weapon mounts (selected weapon shown)
- [ ] 5.4 Render AP (anti-personnel) weapons
- [ ] 5.5 Render manipulator type per arm
- [ ] 5.6 Render jump/UMU/VTOL jets
- [ ] 5.7 Render per-suit pilot block (gunnery + anti-mech skill)
- [ ] 5.8 Snapshot test with an Elemental and a Kage fixture

## 6. Infantry Record Sheet

- [ ] 6.1 Add `infantryRenderer.ts`
- [ ] 6.2 Render platoon size counter (troopers alive / max)
- [ ] 6.3 Render primary weapon stats (damage, range, ammo if applicable)
- [ ] 6.4 Render secondary weapons block (AP weapons, ratio)
- [ ] 6.5 Render field gun block (if present — 1 gun per 7 men rule)
- [ ] 6.6 Render motive type (Foot / Motorized / Jump / Mechanized / Beast)
- [ ] 6.7 Render specialization badge (anti-mech / marine / scuba / mountain / xct)
- [ ] 6.8 Snapshot test with a foot rifle platoon and a marine jump platoon fixture

## 7. ProtoMech Record Sheet

- [ ] 7.1 Add `protoMechRenderer.ts`
- [ ] 7.2 Render 5-location armor diagram (Head/Torso/LA/RA/Legs/(MainGun))
- [ ] 7.3 Render main gun designation and ammo
- [ ] 7.4 Render point composition (up to 5 protos in one sheet)
- [ ] 7.5 Render UMU/glider flags
- [ ] 7.6 Render point pilot block
- [ ] 7.7 Snapshot test with a Roc and a Minotaur point fixture

## 8. Integration

- [ ] 8.1 Existing `/print/[id]` page routes all unit types through the extended `RecordSheetService`
- [ ] 8.2 Existing `recordsheet/spaSection.ts` (Phase 5) is called from every per-type renderer at the appropriate pilot-area coordinate
- [ ] 8.3 `renderer.ts` top-level dispatch picks the per-type renderer by `data.unitType`

## 9. Spec Compliance

- [ ] 9.1 Every `### Requirement:` in the `record-sheet-export` spec delta has a `#### Scenario:`
- [ ] 9.2 `openspec validate add-multi-type-record-sheet-export --strict` passes
