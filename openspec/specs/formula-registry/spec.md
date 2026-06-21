# formula-registry Specification

## Purpose

Defines Formula Registry requirements for Centralized Formulas, Formula Documentation, and Formula Consistency, preserving the source-of-truth scope introduced by archived change implement-phase2-construction.

## Requirements

### Requirement: Centralized Formulas

All calculation formulas SHALL be registered centrally.

#### Scenario: Weight formula registry

- **WHEN** calculating component weight
- **THEN** formula SHALL be retrieved from registry
- **AND** formula source (TechManual page) SHALL be documented

### Requirement: Formula Documentation

Each formula SHALL include source reference.

#### Scenario: Formula metadata

- **WHEN** registering a formula
- **THEN** include formula name
- **AND** include calculation function
- **AND** include source book reference
- **AND** include page number

### Requirement: Formula Consistency

Formulas SHALL be the single source of truth.

#### Scenario: Consistent usage

- **WHEN** multiple systems need same calculation
- **THEN** all SHALL use registry formula
- **AND** no duplicate implementations
