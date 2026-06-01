# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Tactical Projection Contract

The tactical map interface SHALL render movement, combat, terrain/elevation, fog, LOS, cover, and firing-arc highlights from shared rules projections rather than from view-local legality calculations.

Every projection that affects action legality SHALL identify the rule source it is pinned to, using this source order: official BattleTech rules where citable, MegaMek tactical behavior as practical oracle for tactical ambiguity, MekHQ only for campaign/scenario context, then local OpenSpec/Jest fixtures as the project acceptance contract.

#### Scenario: Terrain projection exposes represented building identity

- **GIVEN** a rendered hex has building terrain with a represented building id
- **WHEN** the hex renders and its terrain/elevation projection metadata is inspected
- **THEN** the hex SHALL expose the building id in machine-readable terrain metadata
- **AND** terrain/elevation source detail SHALL include the building id
- **AND** hover terrain context SHALL show the represented building id
- **AND** exposing that identity SHALL NOT change movement, combat, LOS, cover, or physical attack legality
