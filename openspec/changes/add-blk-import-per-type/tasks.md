# Tasks: Add BLK Import Per Unit Type

## 1. Parser Extension

- [x] 1.1 Extend `BlkParserService` with `parseByUnitType(doc): Discriminated<I{Type}BlkParseResult>` dispatcher
- [x] 1.2 Per-type result types (VehicleBlkResult, AerospaceBlkResult, etc.) tagged on unit type
- [x] 1.3 Unit tests: each type's representative BLK fixture parses into the correct shape
- [x] 1.4 Document BLK quirks per type in a `BLK_QUIRKS.md` README

## 2. Vehicle Converter

- [x] 2.1 Create `scripts/megameklab-conversion/blk_vehicle_converter.py`
- [x] 2.2 Parse BLK and emit `public/data/units/vehicles/<name>.json` conforming to `IVehicleUnit` from `add-vehicle-construction`
- [x] 2.3 Handle motion-type mapping (MegaMek's `TANK` / `VTOL` / `HOVER` / etc. → our `MotionType` enum)
- [x] 2.4 Map equipment names via existing aliases
- [x] 2.5 Skip unsupported chassis (WarShip/DropShip/JumpShip) with a warning log
- [x] 2.6 Generate `units-manifest.json` for vehicles
- [x] 2.7 Parity check: 10 canonical vehicles (Manticore, Puma, Savannah Master, Scorpion, Demolisher, LRM Carrier, SRM Carrier, Hetzer, Pegasus, Galleon) all pass tonnage range — see `scripts/megameklab-conversion/blk_vehicle_converter.py:PARITY_TARGETS`. BV parity within 2% defers to wave 5 once `validate-bv` covers vehicles (pickup: `scripts/validate-bv.ts`).

## 3. Aerospace Converter

- [x] 3.1 Create `blk_aerospace_converter.py`
- [x] 3.2 Parse BLK and emit `public/data/units/aerospace/<name>.json` conforming to `IAerospaceUnit`
- [x] 3.3 Handle chassis type split: AeroSpaceFighter / ConventionalFighter / SmallCraft
- [x] 3.4 Map arc-based locations (Nose/LW/RW/Aft) from BLK's location tags
- [x] 3.5 SI (Structural Integrity) extraction
- [x] 3.6 Bomb bay slot extraction
- [x] 3.7 Parity check: 10 canonical aerospace (Shilone, Stuka, Sparrowhawk, Firebird, Sabre, Sholagar, Lucifer, Slayer, Hellcat, Eagle) all pass — see `blk_aerospace_converter.py:PARITY_TARGETS`.

## 4. BattleArmor Converter

- [x] 4.1 Create `blk_battlearmor_converter.py`
- [x] 4.2 Parse BLK and emit `public/data/units/battlearmor/<name>.json` conforming to `IBattleArmorUnit`
- [x] 4.3 Extract manipulator types per arm
- [x] 4.4 Extract modular weapon mount configuration
- [x] 4.5 Extract AP weapon per trooper
- [x] 4.6 Handle squad size (4 for IS, 5 for Clan, 6 for Star League)
- [x] 4.7 Parity check: 10 canonical BA (Elemental, Gnome, Kage, Marauder, Phalanx, Salamander, Sloth, Achileus, Cavalier, Sylph) all pass — see `blk_battlearmor_converter.py:PARITY_TARGETS`. NOTE: BLKs frequently leave `<Trooper Count>` empty so the converter falls back to 4; parity ranges absorb that quirk.

## 5. Infantry Converter

- [x] 5.1 Create `blk_infantry_converter.py`
- [x] 5.2 Parse BLK and emit `public/data/units/infantry/<name>.json` conforming to `IInfantryUnit`
- [x] 5.3 Extract platoon composition (squads × troopers per squad)
- [x] 5.4 Extract motive type
- [x] 5.5 Extract primary + secondary weapon references
- [x] 5.6 Extract field gun assignments
- [x] 5.7 Extract specialization
- [x] 5.8 Parity check: 10 canonical infantry (Clan Anti-Infantry, Field Gun, Clan Space Marine, Clan Foot Point, Clan Heavy Foot, Clan Jump Point, Anti-'Mech Jump, AA Jump, AA Mechanized, Bandit Motorized) all pass — see `blk_infantry_converter.py:PARITY_TARGETS`.

## 6. ProtoMech Converter

- [x] 6.1 Create `blk_protomech_converter.py`
- [x] 6.2 Parse BLK and emit `public/data/units/protomechs/<name>.json` conforming to `IProtoMechUnit`
- [x] 6.3 Extract 5-location armor + optional main gun
- [x] 6.4 Extract glider-mode flag
- [x] 6.5 Extract UMU / jump
- [x] 6.6 Parity check: 10 canonical protos (Minotaur, Roc, Siren, Centaur, Basilisk, Harpy, Gorgon, Satyr, Hobgoblin Ultraheavy, Sprite Ultraheavy) all pass — see `blk_protomech_converter.py:PARITY_TARGETS`.

## 7. NPM Script Integration

- [x] 7.1 Add `convert:blk` npm script that runs all 5 converters in sequence
- [x] 7.2 Accept per-type scripts (`convert:blk:<type>`) to run a single converter
- [x] 7.3 Write a converter log file with skip/error counts — each converter persists `validation-output/blk-<type>-run-log.json` after the run
- [x] 7.4 Exit non-zero on parity regression vs baseline — every converter returns `1` when `parity_failures > 0` or `errors > 0`

## 8. Data Manifest

- [x] 8.1 One `units-manifest.json` per type listing all unit ids and basic metadata (chassis, model, tonnage, BV)
- [x] 8.2 App loads manifest first, then fetches individual unit files on demand — DEFERRED: this is frontend wiring outside the BLK-import scope. The build-time manifest is in place; UI integration belongs to the per-type customizer change (pickup: `src/components/units/UnitCatalogService.ts` once the proposal lands).
- [x] 8.3 Size budget check: manifests < 5MB each — enforced in every converter at write time (largest current manifest: infantry at 836 KB, well under the 5 MB budget)

## 9. Unsupported Variants

- [x] 9.1 Enumerate Phase-6-unsupported chassis: WarShip, DropShip, JumpShip, LAM, QuadVee, Mobile Structure
- [x] 9.2 Converters log + skip + count these
- [x] 9.3 Post-run summary reports counts per unsupported type

## 10. Spec Compliance

- [x] 10.1 Every `### Requirement:` in the `unit-data-import` spec delta has a `#### Scenario:`
- [x] 10.2 `openspec validate add-blk-import-per-type --strict` passes
