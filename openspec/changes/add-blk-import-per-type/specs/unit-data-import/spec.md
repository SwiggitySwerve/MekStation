# unit-data-import (delta — NEW CAPABILITY)

## ADDED Requirements

### Requirement: BLK Parser Dispatches By Unit Type

`BlkParserService.parseByUnitType(doc)` SHALL dispatch on the BLK document's `<UnitType>` tag and return a discriminated union typed to the specific unit kind.

**Rationale**: MegaMek's BLK format covers 6+ unit kinds with substantially different schemas. A single parse output loses type safety.

**Priority**: Critical

#### Scenario: CombatVehicle dispatched

- **GIVEN** a BLK document with `<UnitType>Tank</UnitType>`
- **WHEN** `parseByUnitType` runs
- **THEN** it SHALL return `{ kind: 'vehicle', data: IVehicleBlkResult }`

#### Scenario: AeroSpaceFighter dispatched

- **GIVEN** a BLK document with `<UnitType>Aero</UnitType>`
- **WHEN** `parseByUnitType` runs
- **THEN** it SHALL return `{ kind: 'aerospace', data: IAerospaceBlkResult }`

#### Scenario: Unsupported WarShip logged + skipped

- **GIVEN** a BLK document with `<UnitType>Warship</UnitType>`
- **WHEN** `parseByUnitType` runs
- **THEN** it SHALL return `{ kind: 'unsupported', reason: 'warship' }` and log a warning

---

### Requirement: Per-Type JSON Output Conforming To Construction Types

Each per-type converter SHALL emit JSON files conforming to the `I<Type>Unit` interface defined by the corresponding construction spec, validated against the zod schema before writing.

**Priority**: Critical

#### Scenario: Vehicle output validates against IVehicleUnit

- **GIVEN** a parsed BLK for a 50-ton Manticore tank
- **WHEN** the vehicle converter runs
- **THEN** the output JSON SHALL be parseable by the `IVehicleUnit` zod schema defined in `add-vehicle-construction` with no validation errors

#### Scenario: Aerospace output validates against IAerospaceUnit

- **GIVEN** a parsed BLK for a Shilone aerospace fighter
- **WHEN** the aerospace converter runs
- **THEN** the output JSON SHALL be parseable by the `IAerospaceUnit` zod schema and include `structuralIntegrity`, `safeThrust`, `maxThrust`, `fuelPoints`

---

### Requirement: Parity Validation Against MegaMek Expected Values

Each converter SHALL emit a parity report comparing key fields (tonnage, BV, equipment list length) against expected MegaMek/MUL values for a sample set of 10 canonical units per type.

**Priority**: High

#### Scenario: Parity report generated

- **GIVEN** the vehicle converter run on the mm-data source directory
- **WHEN** the convert:blk script completes
- **THEN** a `validation-output/blk-vehicle-parity.json` report SHALL exist containing per-unit tonnage/BV/equipment-count comparison

#### Scenario: Parity regression fails build

- **GIVEN** an intentional regression in the vehicle converter
- **WHEN** convert:blk is run
- **THEN** the script SHALL exit with a non-zero status if any canonical unit's BV differs from expected by > 2%

---

### Requirement: Equipment Name Alias Reuse

The BLK converters SHALL reuse the existing `EquipmentNameMapper` aliases so BLK equipment names resolve to the same internal equipment IDs used by the MTF pipeline.

**Priority**: High

#### Scenario: BLK name maps to canonical id

- **GIVEN** a BLK equipment line reading `IS ER Medium Laser`
- **WHEN** the converter resolves the equipment
- **THEN** it SHALL produce the same equipment id as the MTF pipeline produces for `ISERMediumLaser`

---

### Requirement: Per-Type Unit Manifest

Each type's converter SHALL write a `units-manifest.json` at `public/data/units/<type>/units-manifest.json` listing every converted unit with id, chassis, model, tonnage, BV — used by the app for manifest-driven lazy loading.

**Priority**: High

#### Scenario: Manifest lists all converted vehicles

- **GIVEN** a successful vehicle converter run producing 4000 vehicle JSON files
- **WHEN** the manifest is inspected
- **THEN** it SHALL contain 4000 entries, each with id, chassis, model, tonnage, BV

#### Scenario: Manifest size budget

- **GIVEN** any per-type manifest
- **WHEN** serialized to disk
- **THEN** its size SHALL be under 5 MB (enforces concise per-entry metadata)

---

### Requirement: Unsupported Chassis Logged And Counted

The converters SHALL log and skip unsupported chassis (WarShip, DropShip, JumpShip, LAM, QuadVee, Mobile Structure) and emit a post-run summary with counts per unsupported type.

**Priority**: Medium

#### Scenario: Unsupported summary

- **GIVEN** the convert:blk run encounters 120 DropShip BLK files and 30 LAMs
- **WHEN** the run completes
- **THEN** a summary line SHALL report "Skipped: 120 dropship, 30 lam" — without failing the build
