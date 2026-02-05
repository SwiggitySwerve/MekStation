# core-enumerations Specification

## Purpose

TBD - created by archiving change implement-phase1-foundation. Update Purpose after archive.

## Requirements

### Requirement: Tech Base Core Enumerations

The system SHALL define tech base enumerations for components and units.

#### Scenario: Component tech base

- **WHEN** assigning tech base to a component
- **THEN** it MUST use TechBase enum (INNER_SPHERE or CLAN)
- **AND** the value MUST be immutable

#### Scenario: Unit tech base with mixed technology

- **WHEN** a unit contains both IS and Clan components
- **THEN** it MUST use UnitTechBase.MIXED

### Requirement: Rules Level Enumerations

The system SHALL define rules complexity classification enumerations.

#### Scenario: Component rules level

- **WHEN** assigning rules level to a component
- **THEN** it MUST use RulesLevel enum
- **AND** value MUST be one of: INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL

#### Scenario: Rules level hierarchy

- **WHEN** filtering components by rules level
- **THEN** higher levels SHALL include all lower levels

### Requirement: Era Enumeration

The system SHALL define canonical BattleTech historical eras.

#### Scenario: Era definition

- **WHEN** defining technology availability
- **THEN** Era enum MUST include all 8 canonical eras
- **AND** each era SHALL have defined year boundaries
