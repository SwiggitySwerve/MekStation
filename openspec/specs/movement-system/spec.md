# movement-system Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Walk/Run MP Calculation

Movement points SHALL be calculated from engine rating and tonnage.

#### Scenario: Walk MP

- **WHEN** calculating walk MP
- **THEN** walkMP = floor(engineRating / tonnage)
- **AND** minimum walk MP = 1

#### Scenario: Run MP

- **WHEN** calculating run MP
- **THEN** runMP = floor(walkMP × 1.5)

### Requirement: Jump Jets

The system SHALL support 8 jump jet types.

#### Scenario: Standard jump jets

- **WHEN** using standard jump jets
- **THEN** jump MP = number of jump jets
- **AND** jump jets SHALL not exceed walk MP
- **AND** weight varies by tonnage class

### Requirement: Movement Enhancements

The system SHALL support MASC, TSM, Supercharger, and Partial Wing with accurate variable calculations using the `EquipmentCalculatorService`.

#### Scenario: MASC weight calculation (IS)

- **WHEN** calculating Inner Sphere MASC weight
- **THEN** weight = round(tonnage / 20) to nearest whole ton
- **AND** criticalSlots = weight
- **AND** cost = tonnage × 1000 C-Bills
- **AND** example: 85t mech = 4 tons (4.25 rounds to 4), 90t mech = 5 tons (4.5 rounds to 5)
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('masc-is', context)`

#### Scenario: MASC weight calculation (Clan)

- **WHEN** calculating Clan MASC weight
- **THEN** weight = round(tonnage / 25) to nearest whole ton
- **AND** criticalSlots = weight
- **AND** cost = tonnage × 1000 C-Bills
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('masc-clan', context)`

#### Scenario: Supercharger weight calculation

- **WHEN** calculating Supercharger weight
- **THEN** weight = ceil(engineWeight / 10) rounded to 0.5 tons
- **AND** criticalSlots = 1 (fixed, does not vary)
- **AND** cost = engineWeight × 10000 C-Bills
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('supercharger', context)`

#### Scenario: Supercharger placement restrictions

- **WHEN** placing Supercharger on mech
- **THEN** Supercharger MUST be adjacent to engine
- **AND** Supercharger MUST be in torso location

#### Scenario: Partial Wing weight calculation

- **WHEN** calculating Partial Wing weight
- **THEN** weight = mechTonnage × 0.05 rounded to 0.5 tons
- **AND** criticalSlots = 3 per side torso (6 total)
- **AND** cost = weight × 50000 C-Bills

#### Scenario: TSM cost calculation

- **WHEN** calculating Triple Strength Myomer cost
- **THEN** cost = mechTonnage × 16000 C-Bills
- **AND** weight = 0 (replaces standard myomer)
- **AND** criticalSlots = 6 distributed across torso/legs

#### Scenario: Enhancement recalculation on engine change

- **WHEN** engine rating or engine type changes
- **AND** MASC or Supercharger is equipped
- **THEN** enhancement weight and slots SHALL be recalculated
- **AND** equipment instances SHALL be updated with new values

### Requirement: Variable Equipment Context

The system SHALL provide calculation context for variable equipment.

#### Scenario: Context availability

- **WHEN** calculating variable equipment properties
- **THEN** context SHALL provide mechTonnage
- **AND** context SHALL provide engineRating
- **AND** context SHALL provide engineWeight
- **AND** context SHALL provide directFireWeaponTonnage
