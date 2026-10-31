## ADDED Requirements

### Requirement: Aerospace max thrust ownership

The aerospace construction owner (`calculateMaxThrust`) SHALL derive max thrust
from safe thrust for BLK imports of aerospace fighters, conventional fighters,
small craft, DropShips, JumpShips, WarShips and space stations, for the default
aerospace state, for safe-thrust and engine-rating store edits and for the
new-unit template summary. Those consumers SHALL read it and SHALL NOT repeat
the formula. Status bars, record sheets and the aerospace BV adapter read the
resulting `maxThrust` and do not derive it. `BlkParserService.extractAerospace`
keeps its own value, twice the safe thrust (it has no production consumer). This
requirement covers where max thrust is derived and, with the Engine and Thrust
Configuration requirement, its upward rounding; it does not establish aerospace
BV parity.

#### Scenario: Every consumer agrees with the owner

- **GIVEN** safe thrust 1, 2, 3, 5, 6, 7 and 12
- **WHEN** max thrust is derived or displayed
- **THEN** the BLK basics, the aerospace-family handlers (fighter, conventional
  fighter, small craft, DropShip, JumpShip, WarShip and space station), the
  store actions, the aerospace BV adapter and the template summary SHALL show
  the owner's result for each safe thrust
- **AND** the status bar SHALL display the stored max thrust it is given
- **AND** the default state SHALL show the owner's result for its own safe thrust

## MODIFIED Requirements

### Requirement: Engine and Thrust Configuration

The system SHALL support engine type selection and thrust-based movement for aerospace fighters.

**Rationale**: Aerospace fighters use thrust ratings rather than walk/run MP, with engine rating derived from tonnage × safe thrust.

**Priority**: Critical

#### Scenario: Engine type selection

**GIVEN** an aerospace fighter in the customizer
**WHEN** selecting an engine type
**THEN** the following engine types SHALL be available: Standard Fusion, XL Engine (IS), XL Engine (Clan), Light Engine, Compact Engine

#### Scenario: Safe thrust determines engine rating

**GIVEN** an aerospace fighter with tonnage T
**WHEN** safe thrust is set to value S
**THEN** engine rating SHALL equal T × S
**AND** max thrust SHALL equal ceil(S × 1.5)

#### Scenario: Engine rating determines safe thrust

**GIVEN** an aerospace fighter with tonnage T
**WHEN** engine rating is set to value R
**THEN** safe thrust SHALL equal floor(R / T)
**AND** max thrust SHALL equal ceil(safe thrust × 1.5)

#### Scenario: Max thrust rounds upward

**GIVEN** aerospace fighters with safe thrust 4 and 5
**WHEN** max thrust is derived
**THEN** max thrust SHALL be 6 and 8 respectively, the upward-rounded run MP of pinned MegaMek (`Entity.java:4004-4016`, revision `48fcb2f64a1b3f2d575707ce5653dad64927b587`)
**AND** the BLK basics, handlers, default state, store actions and template summary SHALL show the owner's result

#### Scenario: Safe thrust bounds

**GIVEN** an aerospace fighter in the customizer UI
**WHEN** adjusting safe thrust via stepper controls
**THEN** safe thrust MUST be at least 1
**AND** safe thrust MUST NOT exceed 12

#### Scenario: Default thrust by tonnage

**GIVEN** a newly created aerospace fighter
**WHEN** tonnage is set
**THEN** default safe thrust SHALL be:

- 6 for tonnage ≤ 30
- 5 for tonnage 31–60
- 4 for tonnage > 60

### Requirement: BLK Parsing

The system SHALL parse aerospace fighters from BLK format documents via the `AerospaceUnitHandler`.

**Priority**: Critical

#### Scenario: Parsing a standard heavy fighter

**GIVEN** a BLK document with unitType "Aero" and mappedUnitType AEROSPACE
**WHEN** the document is parsed
**THEN** the handler SHALL extract:

- Identity: chassis, model, year, tonnage
- Movement: safeThrust from `document.safeThrust`, maxThrust = ceil(safeThrust × 1.5)
- Fuel: from `document.fuel`
- Structure: structuralIntegrity from `document.structuralIntegrity`
- Heat sinks: from `document.heatsinks` (default 10), type from `document.sinkType`
- Armor: parsed as array [nose, leftWing, rightWing, aft] from `document.armor`
- Equipment: parsed from `document.equipmentByLocation` with location normalization
- Cockpit: type code from `document.cockpitType`
- Special features: from `document.rawTags`

#### Scenario: Location string normalization

**GIVEN** equipment location strings from a BLK document
**WHEN** normalizing to `AerospaceLocation` enum values
**THEN** the following mappings SHALL apply:

- "nose", "nose equipment" → NOSE
- "left wing", "left wing equipment" → LEFT_WING
- "right wing", "right wing equipment" → RIGHT_WING
- "aft", "aft equipment" → AFT
- "fuselage", "fuselage equipment" → FUSELAGE
- "wings", "wings equipment" → LEFT_WING (generic mapping)
- Any unrecognized location → FUSELAGE (fallback)

#### Scenario: Equipment mount ID generation

**GIVEN** equipment items parsed from BLK
**WHEN** creating mounted equipment instances
**THEN** each mount SHALL receive a sequential ID in format `mount-{N}` starting from 0
