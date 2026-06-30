## ADDED Requirements

### Requirement: Mission readiness projection
Mission launch SHALL use an explicit readiness projection that includes mission constraints, eligible units, ineligible units, pilot readiness, selected roster, unresolved blockers, and launch consequences.

#### Scenario: Launch gate blocks invalid roster
- **WHEN** the selected roster violates mission constraints or unit readiness rules
- **THEN** mission launch SHALL be blocked and SHALL show each blocking reason before encounter materialization can run

#### Scenario: Encounter receives selected roster
- **WHEN** the player confirms a valid roster
- **THEN** encounter materialization SHALL receive the selected campaign roster units and SHALL NOT silently replace missing or invalid campaign units with stock fallback units
