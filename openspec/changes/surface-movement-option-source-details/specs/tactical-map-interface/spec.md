# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Tactical Projection Contract

The tactical map interface SHALL render movement, combat, terrain/elevation,
fog, LOS, cover, and firing-arc highlights from shared rules projections rather
than from view-local legality calculations.

Every projection that affects action legality SHALL identify the rule source it
is pinned to, using this source order: official BattleTech rules where citable,
MegaMek tactical behavior as practical oracle for tactical ambiguity, MekHQ
only for campaign/scenario context, then local OpenSpec/Jest fixtures as the
project acceptance contract.

#### Scenario: Movement source detail explains same-hex options

- **GIVEN** a rendered hex has one or more movement projection options for the
  selected unit
- **WHEN** the shared tactical projection source references are inspected
- **THEN** the movement source reference SHALL include each represented
  movement option's type or motive mode
- **AND** it SHALL include whether that option is reachable or blocked
- **AND** it SHALL include represented MP cost, terrain cost, elevation cost,
  heat, and blocked reason when those facts are present
- **AND** the source reference SHALL continue to identify MegaMek movement
  rules as the tactical oracle
- **AND** exposing those details SHALL NOT change movement pathfinding or
  commit legality
