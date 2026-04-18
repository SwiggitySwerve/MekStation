# Change: Add BLK Import Per Unit Type

## Why

MegaMek's canonical dataset (`mm-data`) ships ~13,000 non-mech unit definitions as `.blk` files (vehicles, aerospace, BattleArmor, infantry, ProtoMechs). MekStation's `src/services/conversion/BlkParserService.ts` can read the raw BLK format but the parsed output is NOT wired into per-type catalogs — today only mechs (`.mtf`) populate `public/data/units/battlemechs/` via the `convert:mtf` pipeline. Without a matching BLK import pipeline, Phase 6 proposals will ship with empty catalogs for each non-mech type, forcing users to hand-build every unit. This change wires BLK parsing into per-type catalog generation so the Phase 6 customizers open with real data.

## What Changes

- Extend `BlkParserService` to dispatch to per-type extractors based on BLK `<UnitType>` tag (CombatVehicle / AeroSpaceFighter / ConventionalFighter / SmallCraft / BattleArmor / Infantry / ProtoMech)
- Add per-type BLK → JSON converters under `scripts/megameklab-conversion/`:
  - `blk_vehicle_converter.py`
  - `blk_aerospace_converter.py`
  - `blk_battlearmor_converter.py`
  - `blk_infantry_converter.py`
  - `blk_protomech_converter.py`
- Each converter produces unit JSON conforming to the corresponding `I<Type>Unit` shape from the matching construction proposal
- Extend the main `convert:mtf` npm script (or add `convert:blk`) to run all 5 per-type converters on `E:\Projects\mm-data\data\` and write outputs to `public/data/units/<type>/`
- Add unit-data index files per type (mirrors existing `public/data/units/battlemechs/units-manifest.json`)
- Add BLK parity validation (mirrors `mtf-parity-validation` spec): compare key fields (tonnage, BV, equipment) against expected MegaMek values for a sample fixture per type
- Handle BLK-specific quirks:
  - BLK equipment lines use different naming than MTF (`IS ER Medium Laser` vs `ISERLargeLaser`) — reuse existing `EquipmentNameMapper` aliases
  - BLK locations differ per unit type (Front/Rear/LS/RS for vehicles vs Nose/LW/RW/Aft for aerospace)
  - Some BLK files have configuration blocks that the mech pipeline doesn't understand
- Log + report unsupported BLK variants (DropShips, JumpShips, WarShips, LAMs, QuadVees are Phase 6 non-goals and SHOULD be skipped with a warning)

## Non-goals

- Support vehicle BAR tables beyond what `add-vehicle-construction` defines
- DropShip / JumpShip / WarShip / LAM / QuadVee import — explicitly skipped with log
- Runtime editing of catalog files from the app — catalog is build-time generated; UI imports from `public/data/`
- Python → TypeScript rewrite of the converters — keep the existing Python pipeline pattern

## Dependencies

- **Requires**: `add-vehicle-construction`, `add-aerospace-construction`, `add-battlearmor-construction`, `add-infantry-construction`, `add-protomech-construction` (each defines the target data shape), existing `BlkParserService`, existing Python MTF converter as a reference
- **Required by**: none directly — users benefit from populated catalogs immediately after each type lands
- **Phase coupling**: none

## Ordering in Phase 6

Ship one converter per unit type, AFTER that type's construction proposal has stabilized the target shape:

```
add-vehicle-construction        → blk_vehicle_converter + 4000 vehicles
add-aerospace-construction      → blk_aerospace_converter + 2000 aerospace
add-battlearmor-construction    → blk_battlearmor_converter + 800 BA
add-infantry-construction       → blk_infantry_converter + 500 infantry
add-protomech-construction      → blk_protomech_converter + 150 protos
```

Each sub-task ships an empty JSON for unsupported variants and a parity report.

## Impact

- **Affected specs**: a new `unit-data-import` capability spec is created (or an existing conversion/import spec is extended — authorship discretion)
- **Affected code**: `src/services/conversion/BlkParserService.ts`, `scripts/megameklab-conversion/*.py` (new converters), `package.json` scripts
- **New files**: 5 Python converter scripts, parity validation reports, per-type `units-manifest.json`, populated `public/data/units/vehicles/`, `aerospace/`, `battlearmor/`, `infantry/`, `protomechs/`
- **Data delta**: ~13,000 new JSON unit files (expect ~50–200 MB of new data; committed selectively — canonicals only; variants fetched on demand)
- **No runtime behavior change for mechs**
