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

#### Scenario: Movement step-cost badge keeps projection provenance

- **GIVEN** a reachable movement destination has represented terrain or
  elevation step costs
- **WHEN** the tactical map renders the visible movement step-cost badge
- **THEN** the badge SHALL expose the shared movement-channel tactical
  projection source and MegaMek-backed rule references
- **AND** the badge SHALL expose the projection explanation that includes the
  represented terrain and elevation cost details
- **AND** the badge SHALL continue to expose terrain cost, elevation delta, and
  elevation cost metadata without relying only on color
- **AND** exposing those details SHALL NOT change terrain/elevation MP math,
  pathfinding, or commit legality
