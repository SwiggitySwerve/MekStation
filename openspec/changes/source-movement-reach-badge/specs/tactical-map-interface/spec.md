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

#### Scenario: Movement reach badge keeps projection provenance

- **GIVEN** a selected unit has one or more reachable movement options for a
  destination hex
- **WHEN** the tactical map renders the normal movement reach badge before any
  hover path preview replaces it
- **THEN** the badge SHALL expose the shared movement-channel tactical
  projection source and MegaMek-backed rule references
- **AND** the badge SHALL expose the projection explanation that includes the
  represented movement options
- **AND** the badge SHALL continue to expose represented MP cost, movement
  type/mode, terrain cost, elevation delta/cost, heat, and same-hex option
  metadata when those facts are present
- **AND** exposing those details SHALL NOT change pathfinding or commit
  legality
