## ADDED Requirements

### Requirement: Tactical Reload Preview Entry Point
The unit reload reconciliation system SHALL support tactical GM preview routing for a selected or active encounter unit.

#### Scenario: Tactical reload requires source payload data
- **WHEN** the tactical command surface routes a GM unit reload command without source unit snapshot data
- **THEN** the reload preview SHALL be blocked with a clear reason
- **AND** it SHALL preserve the encounter state without applying a partial reload

#### Scenario: Tactical reload with source payload uses existing reconciliation
- **WHEN** the tactical command surface routes a GM unit reload command with source unit snapshot data
- **THEN** the existing unit reload implementer SHALL preview the reload and any manual takeover conflicts
- **AND** approval SHALL update only the targeted active unit
