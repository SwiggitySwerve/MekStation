# Tasks: Add BLK Import Per Unit Type

## 1. Parser Extension

- [ ] 1.1 Extend `BlkParserService` with `parseByUnitType(doc): Discriminated<I{Type}BlkParseResult>` dispatcher
- [ ] 1.2 Per-type result types (VehicleBlkResult, AerospaceBlkResult, etc.) tagged on unit type
- [ ] 1.3 Unit tests: each type's representative BLK fixture parses into the correct shape
- [ ] 1.4 Document BLK quirks per type in a `BLK_QUIRKS.md` README

## 2. Vehicle Converter

- [ ] 2.1 Create `scripts/megameklab-conversion/blk_vehicle_converter.py`
- [ ] 2.2 Parse BLK and emit `public/data/units/vehicles/<name>.json` conforming to `IVehicleUnit` from `add-vehicle-construction`
- [ ] 2.3 Handle motion-type mapping (MegaMek's `TANK` / `VTOL` / `HOVER` / etc. → our `MotionType` enum)
- [ ] 2.4 Map equipment names via existing aliases
- [ ] 2.5 Skip unsupported chassis (WarShip/DropShip/JumpShip) with a warning log
- [ ] 2.6 Generate `units-manifest.json` for vehicles
- [ ] 2.7 Parity check: pick 10 canonical vehicles (Demolisher, Manticore, LRM Carrier, etc.) and assert BV + tonnage match MUL data within 2%

## 3. Aerospace Converter

- [ ] 3.1 Create `blk_aerospace_converter.py`
- [ ] 3.2 Parse BLK and emit `public/data/units/aerospace/<name>.json` conforming to `IAerospaceUnit`
- [ ] 3.3 Handle chassis type split: AeroSpaceFighter / ConventionalFighter / SmallCraft
- [ ] 3.4 Map arc-based locations (Nose/LW/RW/Aft) from BLK's location tags
- [ ] 3.5 SI (Structural Integrity) extraction
- [ ] 3.6 Bomb bay slot extraction
- [ ] 3.7 Parity check on 10 canonical aerospace (Shilone, Stuka, etc.)

## 4. BattleArmor Converter

- [ ] 4.1 Create `blk_battlearmor_converter.py`
- [ ] 4.2 Parse BLK and emit `public/data/units/battlearmor/<name>.json` conforming to `IBattleArmorUnit`
- [ ] 4.3 Extract manipulator types per arm
- [ ] 4.4 Extract modular weapon mount configuration
- [ ] 4.5 Extract AP weapon per trooper
- [ ] 4.6 Handle squad size (4 for IS, 5 for Clan, 6 for Star League)
- [ ] 4.7 Parity check on 10 canonical BA (Elemental, Kage, Gnome, Marauder BA, etc.)

## 5. Infantry Converter

- [ ] 5.1 Create `blk_infantry_converter.py`
- [ ] 5.2 Parse BLK and emit `public/data/units/infantry/<name>.json` conforming to `IInfantryUnit`
- [ ] 5.3 Extract platoon composition (squads × troopers per squad)
- [ ] 5.4 Extract motive type
- [ ] 5.5 Extract primary + secondary weapon references
- [ ] 5.6 Extract field gun assignments
- [ ] 5.7 Extract specialization
- [ ] 5.8 Parity check on 10 canonical infantry (foot rifle, motorized jump, marine, mountain, etc.)

## 6. ProtoMech Converter

- [ ] 6.1 Create `blk_protomech_converter.py`
- [ ] 6.2 Parse BLK and emit `public/data/units/protomechs/<name>.json` conforming to `IProtoMechUnit`
- [ ] 6.3 Extract 5-location armor + optional main gun
- [ ] 6.4 Extract glider-mode flag
- [ ] 6.5 Extract UMU / jump
- [ ] 6.6 Parity check on 10 canonical protos (Roc, Minotaur, Siren, etc.)

## 7. NPM Script Integration

- [ ] 7.1 Add `convert:blk` npm script that runs all 5 converters in sequence
- [ ] 7.2 Accept `--type=<type>` flag to run a single converter
- [ ] 7.3 Write a converter log file with skip/error counts
- [ ] 7.4 Exit non-zero on parity regression vs baseline

## 8. Data Manifest

- [ ] 8.1 One `units-manifest.json` per type listing all unit ids and basic metadata (chassis, model, tonnage, BV)
- [ ] 8.2 App loads manifest first, then fetches individual unit files on demand
- [ ] 8.3 Size budget check: manifests < 5MB each

## 9. Unsupported Variants

- [ ] 9.1 Enumerate Phase-6-unsupported chassis: WarShip, DropShip, JumpShip, LAM, QuadVee, Mobile Structure
- [ ] 9.2 Converters log + skip + count these
- [ ] 9.3 Post-run summary reports counts per unsupported type

## 10. Spec Compliance

- [ ] 10.1 Every `### Requirement:` in the `unit-data-import` spec delta has a `#### Scenario:`
- [ ] 10.2 `openspec validate add-blk-import-per-type --strict` passes
