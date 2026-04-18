# record-sheet-export (delta)

## ADDED Requirements

### Requirement: Discriminated Per-Type Record Sheet Data Model

The `IRecordSheetData` type SHALL be a discriminated union tagged on `unitType`, with one variant per supported unit type: `mech`, `vehicle`, `aerospace`, `battlearmor`, `infantry`, `protomech`.

**Rationale**: Each unit type has fundamentally different armor geometry, movement profile, crew model, and equipment layout. A single flat payload cannot represent all 6 shapes safely. Discriminated unions preserve type safety at the extractor → renderer boundary.

**Priority**: Critical

#### Scenario: Mech variant preserves existing shape

- **GIVEN** an `IBattleMech` passed to `RecordSheetService.extractData`
- **WHEN** the extractor runs
- **THEN** the return value SHALL have `unitType: 'mech'` and the existing mech record-sheet fields (identity, movement, armor per mech location, critical slots, heat sinks)

#### Scenario: Vehicle variant includes motive data

- **GIVEN** an `IVehicleUnit` with motion type Tracked, turret Single
- **WHEN** extracted
- **THEN** the return value SHALL have `unitType: 'vehicle'`, `motionType: 'Tracked'`, armor payload covering 5 locations (Front/LSide/RSide/Rear/Turret), and crew payload with driver + gunner

#### Scenario: Aerospace variant includes SI and fuel

- **GIVEN** an `IAerospaceUnit` (aerospace fighter, 50t)
- **WHEN** extracted
- **THEN** the return value SHALL have `unitType: 'aerospace'`, armor per 4 arcs, `structuralIntegrity`, `fuelPoints`, `safeThrust`, `maxThrust`, and pilot payload

#### Scenario: Unknown unit type rejected

- **GIVEN** a unit with `type: 'warship'`
- **WHEN** extraction is attempted
- **THEN** the service SHALL throw `UnsupportedUnitTypeError` with the unsupported type in the message

---

### Requirement: Per-Type SVG Renderers

The system SHALL provide a dedicated SVG renderer module per unit type, each consuming its matching `IRecordSheetData` variant and producing an SVG string conforming to the canonical Total Warfare record-sheet layout for that type.

**Priority**: Critical

#### Scenario: Renderer dispatch by variant tag

- **GIVEN** an `IVehicleRecordSheetData` payload
- **WHEN** the top-level `renderer.ts` dispatcher is called
- **THEN** it SHALL delegate to `vehicleRenderer.render(data)` and return the resulting SVG

#### Scenario: Vehicle armor diagram geometry

- **GIVEN** a VTOL unit with Rotor location
- **WHEN** the vehicle renderer runs
- **THEN** the output SVG SHALL include both a standard 4-side armor diagram AND a separate Rotor location block

#### Scenario: Aerospace 4-arc diagram

- **GIVEN** any aerospace unit
- **WHEN** the aerospace renderer runs
- **THEN** the output SVG SHALL show armor pips for Nose, Left Wing, Right Wing, Aft arcs — no front/rear as mechs use

#### Scenario: BattleArmor per-trooper grid

- **GIVEN** a 5-trooper Elemental point
- **WHEN** the battlearmor renderer runs
- **THEN** the output SVG SHALL show 5 distinct trooper columns, each with its own armor pip grid and loadout section

#### Scenario: Infantry platoon counter (no per-location armor)

- **GIVEN** a 28-trooper foot rifle platoon
- **WHEN** the infantry renderer runs
- **THEN** the output SVG SHALL show a platoon-size counter rather than per-location armor pips, plus primary + secondary weapon blocks

#### Scenario: ProtoMech 5-location compact sheet

- **GIVEN** a 5-proto point
- **WHEN** the protomech renderer runs
- **THEN** the output SVG SHALL render 5 compact per-proto sheets on one page, each with the 5-location (Head/Torso/LA/RA/Legs/±MainGun) diagram

---

### Requirement: Per-Type Extractors

The `RecordSheetService` SHALL route `extractData(unit)` to a type-specific extractor by `unit.type`, each producing the matching variant of `IRecordSheetData`.

**Priority**: Critical

#### Scenario: Vehicle extractor populates crew

- **GIVEN** a 40-ton Hover vehicle with crew configured (driver + gunner)
- **WHEN** `extractVehicleData(unit)` runs
- **THEN** the result's `crew` field SHALL list the driver and gunner with their skills, and the commander field SHALL be absent (no commander on 40t)

#### Scenario: BattleArmor extractor populates per-suit

- **GIVEN** a 5-trooper point with modular weapon mounts
- **WHEN** `extractBattleArmorData(unit)` runs
- **THEN** the result SHALL contain 5 entries in `troopers`, each with the currently-selected modular weapon and AP sidearm

#### Scenario: Infantry extractor populates field gun

- **GIVEN** a 28-trooper platoon with 4 field guns
- **WHEN** `extractInfantryData(unit)` runs
- **THEN** the result SHALL contain a `fieldGun` block with 4 guns, reflecting the 1-gun-per-7-troopers rule

---

### Requirement: SPA Block Positioning Per Type

The Special Abilities SVG section (shipped in Phase 5) SHALL be anchored within each per-type renderer's pilot area, not at a mech-only coordinate.

**Priority**: High

#### Scenario: Vehicle SPA block anchored in crew area

- **GIVEN** a vehicle with a driver who has the Melee Specialist SPA
- **WHEN** the vehicle renderer runs
- **THEN** the Special Abilities block SHALL render within the crew section of the vehicle sheet, not at the mech pilot coordinate (360, 690)

#### Scenario: BattleArmor SPA block per-trooper

- **GIVEN** a point where trooper 1 has Marksman SPA
- **WHEN** the battlearmor renderer runs
- **THEN** the SPA SHALL display next to trooper 1's pilot block, not on a shared sheet footer

---

### Requirement: Snapshot Test Coverage

Every per-type renderer SHALL have at least one Jest snapshot test with a representative fixture, and the snapshot SHALL be committed alongside the renderer.

**Priority**: High

#### Scenario: Snapshot captures geometry regression

- **GIVEN** the vehicle renderer's snapshot test running on a 50t tracked tank fixture
- **WHEN** the armor location geometry changes (e.g., a location is accidentally removed)
- **THEN** the snapshot assertion SHALL fail with a diff showing the missing location
