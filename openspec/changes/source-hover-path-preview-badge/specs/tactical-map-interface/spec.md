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

#### Scenario: Hover path badge keeps movement projection provenance

- **GIVEN** a selected unit has a reachable movement destination
- **WHEN** the player hovers that destination and the map renders the path MP
  preview badge
- **THEN** the badge SHALL continue to expose movement type and motive mode
- **AND** it SHALL expose represented MP cost, terrain cost, elevation
  delta/cost, and heat when those facts are present
- **AND** it SHALL expose the shared `movement:megamek` projection source and
  MegaMek rule references
- **AND** its accessible label SHALL include the same terrain, elevation, and
  heat context
- **AND** exposing those details SHALL NOT change pathfinding or commit
  legality
