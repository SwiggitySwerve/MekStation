# OmniMech System Specification

## Overview

This specification defines the OmniMech support system, enabling users to work with OmniMech units that have modular pod-mounted equipment and fixed base chassis components.

## ADDED Requirements

### Requirement: OmniMech Identification

The system SHALL identify OmniMech units distinct from standard BattleMechs.

#### Scenario: Detect OmniMech from MTF config

- **Given** an MTF file with `Config:Biped Omnimech`
- **When** the file is parsed
- **Then** the unit's `isOmni` flag is set to `true`

#### Scenario: Detect OmniMech from is_omnimech flag

- **Given** a unit data object with `is_omnimech: true`
- **When** the unit is loaded
- **Then** the unit's `isOmni` flag is set to `true`

#### Scenario: Standard mech has isOmni false

- **Given** an MTF file with `Config:Biped` (no "Omnimech")
- **When** the file is parsed
- **Then** the unit's `isOmni` flag is set to `false`

---

### Requirement: Base Chassis Heat Sinks

The system SHALL track the number of heat sinks permanently fixed to the OmniMech chassis.

#### Scenario: Parse base chassis heat sinks from MTF

- **Given** an OmniMech MTF file with `Base Chassis Heat Sinks:15`
- **When** the file is parsed
- **Then** the unit's `baseChassisHeatSinks` is set to `15`

#### Scenario: Default base chassis heat sinks

- **Given** an OmniMech without explicit base chassis heat sinks field
- **When** the unit is loaded
- **Then** the `baseChassisHeatSinks` defaults to the engine's integral heat sink capacity

#### Scenario: Export base chassis heat sinks

- **Given** an OmniMech unit with `baseChassisHeatSinks: 12`
- **When** the unit is exported to MTF format
- **Then** the output contains `Base Chassis Heat Sinks:12`

---

### Requirement: Pod vs Fixed Equipment Tracking

The system SHALL distinguish between fixed and pod-mounted equipment on OmniMechs.

#### Scenario: Parse pod equipment from MTF

- **Given** an OmniMech MTF with equipment line `CLERLargeLaser (omnipod)`
- **When** the file is parsed
- **Then** the mounted equipment has `isOmniPodMounted: true`

#### Scenario: Parse fixed equipment from MTF

- **Given** an OmniMech MTF with equipment line `CLDoubleHeatSink` (no omnipod marker)
- **When** the file is parsed
- **Then** the mounted equipment has `isOmniPodMounted: false`

#### Scenario: Export pod equipment to MTF

- **Given** an OmniMech unit with equipment having `isOmniPodMounted: true`
- **When** the unit is exported to MTF format
- **Then** the equipment line includes `(omnipod)` suffix

#### Scenario: Export fixed equipment to MTF

- **Given** an OmniMech unit with equipment having `isOmniPodMounted: false`
- **When** the unit is exported to MTF format
- **Then** the equipment line does NOT include `(omnipod)` suffix

---

### Requirement: Clan Name Support

The system SHALL track the Clan reporting name for OmniMech units.

#### Scenario: Parse clan name from MTF

- **Given** an OmniMech MTF with `clanname:Timber Wolf`
- **When** the file is parsed
- **Then** the unit's `clanName` is set to `Timber Wolf`

#### Scenario: Export clan name to MTF

- **Given** an OmniMech unit with `clanName: "Dire Wolf"`
- **When** the unit is exported to MTF format
- **Then** the output contains `clanname:Dire Wolf`

---

### Requirement: Can Pod Mount Determination

The system SHALL determine whether specific equipment can be pod-mounted based on equipment type and unit state.

#### Scenario: Weapons can be pod mounted

- **Given** an OmniMech unit
- **And** a weapon equipment item
- **When** checking if the equipment can be pod mounted
- **Then** `canPodMount()` returns `true`

#### Scenario: Engine cannot be pod mounted

- **Given** an OmniMech unit
- **And** engine equipment (isOmniFixedOnly)
- **When** checking if the equipment can be pod mounted
- **Then** `canPodMount()` returns `false`

#### Scenario: Heat sink pod mounting depends on minimum

- **Given** an OmniMech unit with engine requiring 10 fixed heat sinks
- **And** currently 10 heat sinks are fixed
- **When** checking if a heat sink can be pod mounted
- **Then** `canPodMount()` returns `false` (would drop below minimum)

#### Scenario: Heat sink can be pod mounted when above minimum

- **Given** an OmniMech unit with engine requiring 10 fixed heat sinks
- **And** currently 12 heat sinks are fixed
- **When** checking if a heat sink can be pod mounted
- **Then** `canPodMount()` returns `true`

---

### Requirement: Reset Chassis Action

The system SHALL provide an action to remove all pod-mounted equipment while preserving fixed components.

#### Scenario: Reset chassis removes pod equipment

- **Given** an OmniMech unit with 5 fixed items and 8 pod items
- **When** the user triggers "Reset Chassis"
- **Then** all 8 pod items are removed
- **And** all 5 fixed items remain

#### Scenario: Reset chassis preserves structural components

- **Given** an OmniMech unit with engine, gyro, cockpit, and structure
- **When** the user triggers "Reset Chassis"
- **Then** engine, gyro, cockpit, and structure remain unchanged

---

### Requirement: Pod Space Calculation

The system SHALL calculate available pod space per location.

#### Scenario: Calculate pod space in arm

- **Given** an OmniMech with 12-slot arm
- **And** 2 slots occupied by fixed actuators
- **And** 3 slots occupied by fixed equipment
- **When** calculating pod space for that arm
- **Then** available pod space is 7 slots

#### Scenario: Pod space accounts for fixed heat sinks

- **Given** an OmniMech with base chassis heat sinks in torso
- **When** calculating pod space for that torso
- **Then** fixed heat sink slots are excluded from available pod space

## Cross-References

- `serialization-formats` - MTF parsing and export of OmniMech fields
- `heat-sink-system` - Base chassis heat sink management
- `equipment-placement` - Pod mounting rules and constraints
- `validation-rules-master` - OmniMech-specific validation rules
