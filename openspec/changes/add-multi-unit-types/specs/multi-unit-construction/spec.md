# Multi-Unit Construction Specification

## ADDED Requirements

### Requirement: Unit Type Abstraction

The system SHALL provide a common interface for all constructible unit types.

#### Scenario: Common unit properties
- **GIVEN** any unit type (BattleMech, Vehicle, Aerospace, Infantry)
- **WHEN** accessing unit properties
- **THEN** all units MUST have: id, name, tonnage, techBase, rulesLevel
- **AND** all units MUST have armor allocation (type-specific locations)
- **AND** all units MUST have equipment mounting capability

#### Scenario: Type-specific extensions
- **GIVEN** a unit of a specific type
- **WHEN** accessing type-specific properties
- **THEN** BattleMechs have: engine, gyro, cockpit, criticalSlots
- **AND** Vehicles have: motiveType, turret, crewSize
- **AND** Aerospace have: safeThrust, fuel, structuralIntegrity
- **AND** Infantry have: platoonSize, motiveType, armorType

### Requirement: Vehicle Construction

The system SHALL support construction of combat vehicles per TechManual rules.

#### Scenario: Vehicle motive types
- **GIVEN** a vehicle under construction
- **WHEN** selecting motive type
- **THEN** tracked, wheeled, hover, and VTOL options SHALL be available
- **AND** each motive type has specific MP costs and restrictions

#### Scenario: Vehicle locations
- **GIVEN** a combat vehicle
- **WHEN** allocating armor or equipment
- **THEN** locations SHALL include: front, left, right, rear, turret (if present)
- **AND** VTOL units have rotor location instead of turret

#### Scenario: Turret configuration
- **GIVEN** a non-VTOL vehicle
- **WHEN** configuring turret
- **THEN** turret MAY be present or absent
- **AND** turret has weight cost based on mounted weapons
- **AND** turret provides 360-degree weapon arc

### Requirement: Aerospace Construction

The system SHALL support construction of aerospace units per TechManual rules.

#### Scenario: Aerospace unit types
- **GIVEN** aerospace construction mode
- **WHEN** selecting unit type
- **THEN** conventional fighter, aerospace fighter, and small craft options SHALL be available

#### Scenario: Aerospace locations
- **GIVEN** an aerospace unit
- **WHEN** allocating armor or equipment
- **THEN** locations SHALL include: nose, left wing, right wing, aft, fuselage
- **AND** armor points use aerospace-specific maximums

#### Scenario: Thrust and fuel
- **GIVEN** an aerospace unit under construction
- **WHEN** configuring propulsion
- **THEN** safe thrust rating MUST be specified
- **AND** fuel tonnage MUST be allocated
- **AND** fuel determines operational range

### Requirement: Infantry Construction

The system SHALL support construction of infantry units per TechManual rules.

#### Scenario: Infantry platoon types
- **GIVEN** infantry construction mode
- **WHEN** selecting platoon configuration
- **THEN** foot, motorized, mechanized, and jump infantry options SHALL be available
- **AND** each type has specific movement and equipment restrictions

#### Scenario: Battle armor construction
- **GIVEN** battle armor construction mode
- **WHEN** building a suit
- **THEN** weight class (PA(L), light, medium, heavy, assault) MUST be selected
- **AND** manipulators, weapons, and equipment are mounted per suit
- **AND** squad size is configured (typically 4-6)

### Requirement: Equipment Compatibility Matrix

The system SHALL enforce equipment compatibility rules per unit type.

#### Scenario: Mech-only equipment
- **GIVEN** equipment marked as BattleMech-only
- **WHEN** attempting to mount on a vehicle or aerospace
- **THEN** the system SHALL reject the mounting
- **AND** provide clear error message

#### Scenario: Vehicle-compatible equipment
- **GIVEN** equipment compatible with vehicles
- **WHEN** mounting on a combat vehicle
- **THEN** the system SHALL allow the mounting
- **AND** apply vehicle-specific slot/weight rules

#### Scenario: Cross-compatible equipment
- **GIVEN** equipment compatible with multiple unit types
- **WHEN** mounting on any compatible type
- **THEN** the system SHALL allow the mounting
- **AND** apply type-appropriate rules (slots, weight, restrictions)
