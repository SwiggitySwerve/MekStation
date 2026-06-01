# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Tactical Projection Contract

The tactical map interface SHALL render movement, combat, terrain/elevation, fog, LOS, cover, and firing-arc highlights from shared rules projections rather than from view-local legality calculations.

Every projection that affects action legality SHALL identify the rule source it is pinned to, using this source order: official BattleTech rules where citable, MegaMek tactical behavior as practical oracle for tactical ambiguity, MekHQ only for campaign/scenario context, then local OpenSpec/Jest fixtures as the project acceptance contract.

#### Scenario: Terrain projection exposes represented cliff exits

- **GIVEN** a rendered hex has represented directional `cliffTopExits`
- **WHEN** the hex renders and its terrain/elevation projection metadata is inspected
- **THEN** the hex SHALL expose the cliff exit directions in machine-readable terrain metadata
- **AND** terrain/elevation source detail SHALL include the cliff exit direction labels
- **AND** hover terrain context SHALL show the represented cliff edge directions
- **AND** exposing those directions SHALL NOT change movement, combat, LOS, cover, or parser behavior
