## MODIFIED Requirements

### Requirement: Tonnage and Weight Class

The system SHALL enforce tonnage ranges and derive weight classes for aerospace units.

**Rationale**: BattleTech defines specific tonnage ranges for aerospace fighters with weight class thresholds.

**Priority**: Critical

#### Scenario: Valid ASF tonnage range

**GIVEN** an aerospace fighter
**WHEN** setting tonnage
**THEN** tonnage MUST be between 5 and 100 tons inclusive
**AND** tonnage SHALL be selectable in 5-ton increments (5, 10, 15, ... 100)

#### Scenario: Weight class derivation for store state

**GIVEN** an aerospace fighter in the customizer store
**WHEN** tonnage is set
**THEN** weight class SHALL be derived as:

- Light: tonnage ≤ 19
- Medium: tonnage 20–39
- Heavy: tonnage 40–69
- Assault: tonnage ≥ 70

#### Scenario: Weight class derivation for BLK handler

**GIVEN** an aerospace fighter parsed from BLK format
**WHEN** weight class is calculated
**THEN** weight class SHALL be derived as:

- Light: tonnage ≤ 45
- Medium: tonnage 46–70
- Heavy: tonnage > 70

#### Scenario: Tonnage change recalculates engine rating

**GIVEN** an aerospace fighter with safe thrust T
**WHEN** tonnage is changed to a new value N
**THEN** engine rating SHALL be recalculated as N × T
**AND** engine rating SHALL be clamped to range [10, 400]
**AND** structural integrity SHALL be re-derived by the shared SI rule, max(floor(N / 10), T) for an aerospace or conventional fighter and T for a FixedWingSupport

### Requirement: Structural Integrity

The system SHALL track structural integrity for aerospace fighters. Fighter SI SHALL be derived, as pinned MegaMek derives it, by one rule owner (`resolveAerospaceStructuralIntegrity`) that the BLK parser, the aerospace handlers, the aerospace store and the definition mapper all use.

**Rationale**: Structural integrity represents the aerospace unit's structural resilience and contributes to survivability. MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587` derives fighter SI on load (`Aero.java:804-808`, `FixedWingSupport.java:135-138`), never reads a fighter SI tag, and writes the tag only for small craft and JumpShips (`BLKFile.java:1070-1072`).

**Priority**: High

#### Scenario: SI minimum

**GIVEN** an aerospace fighter
**WHEN** setting structural integrity
**THEN** SI MUST be at least 1

#### Scenario: Default SI

**GIVEN** a newly created aerospace fighter with tonnage T and safe thrust S
**WHEN** default state is generated
**THEN** default SI SHALL be max(floor(T / 10), S) for an aerospace or conventional fighter
**AND** default SI SHALL be S for a FixedWingSupport

#### Scenario: SI follows safe thrust

**GIVEN** an aerospace fighter in the customizer store
**WHEN** safe thrust or engine rating changes
**THEN** structural integrity SHALL be re-derived from the new safe thrust

#### Scenario: Derived SI carries no tonnage

**GIVEN** an aerospace or conventional fighter whose SI exceeds ceil(tonnage / 10), such as the 25-ton Thrush Maximillian with SI 15
**WHEN** the weight breakdown is computed
**THEN** SI tonnage SHALL be 0
**AND** small craft SHALL still pay for SI above ceil(tonnage / 10)

#### Scenario: Fighter SI tag is ignored on import and not exported

**GIVEN** a fighter BLK document with a structural_integrity tag
**WHEN** it is parsed
**THEN** the tag SHALL be ignored and SI SHALL be derived
**AND** exporting an aerospace or conventional fighter SHALL NOT write a structural_integrity tag
**AND** exporting a small craft SHALL write its structural_integrity tag

## ADDED Requirements

### Requirement: Aerospace definition to editor state

The system SHALL map a validated aerospace definition from `loadUnitDefinition('aerospace', id)` to the existing `AerospaceState` for aerospace fighters, conventional fighters and FixedWingSupport, and SHALL reject small craft definitions with an unsupported-configuration error.

#### Scenario: Fighter definition opens in the aerospace store

**GIVEN** a converted fighter definition
**WHEN** it is mapped
**THEN** the state SHALL carry its identity, tonnage, engine, safe and maximum thrust, fuel points, heat sinks, arc armor and armor type, bomb fields and equipment by arc
**AND** its structural integrity SHALL come from the shared SI rule, so it equals the pinned MegaMek value
**AND** a FixedWingSupport definition SHALL be marked as FixedWingSupport so later SI derivations use safe thrust

#### Scenario: Unknown arcs are rejected

**GIVEN** a definition whose equipment names an arc outside Nose, Left Wing, Right Wing, Aft and Fuselage
**WHEN** it is mapped
**THEN** mapping SHALL fail with an unsupported-configuration error rather than guess an arc

### Requirement: Aerospace max thrust ownership

The aerospace construction owner (`calculateMaxThrust`) SHALL derive max thrust
from safe thrust for BLK imports of aerospace fighters, conventional fighters,
small craft, DropShips, JumpShips, WarShips and space stations, for the default
aerospace state, for safe-thrust and engine-rating store edits and for the
new-unit template summary. Those consumers SHALL read it and SHALL NOT repeat
the formula. Status bars, record sheets and the aerospace BV adapter read the
resulting `maxThrust` and do not derive it. Two paths keep their own values
here: duplicating or reopening an aerospace store keeps the default state's
max thrust rather than deriving it, and `BlkParserService.extractAerospace`
reports twice the safe thrust (it has no production consumer). This requirement
covers where max thrust is derived; it does not change the rounding rule or
establish aerospace BV parity.

#### Scenario: Every consumer agrees with the owner

- **GIVEN** safe thrust 1, 2, 3, 5, 6, 7 and 12
- **WHEN** max thrust is derived or displayed
- **THEN** the BLK basics, the aerospace-family handlers (fighter, conventional
  fighter, small craft, DropShip, JumpShip, WarShip and space station), the
  store actions, the aerospace BV adapter and the template summary SHALL show
  the owner's result for each safe thrust
- **AND** the status bar SHALL display the stored max thrust it is given
- **AND** the default state SHALL show the owner's result for its own safe thrust
