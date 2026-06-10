# Spec Delta: Movement System

## ADDED Requirements

### Requirement: Movement Terrain And Elevation Costs

Movement cost calculation SHALL apply source-backed terrain and elevation MP
costs for represented unit movement modes while preserving preview and commit
validation agreement.

#### Scenario: Parsed board cliff metadata drives movement projection

- **GIVEN** a MegaMek `.board` file imports a valid `cliff_top` exit on the high
  side of a 1- or 2-level drop
- **WHEN** the tactical movement projection evaluates movement across that edge
- **THEN** the projection SHALL use the imported `cliffTopExits` metadata for
  the same WiGE cliff-ascent cost and vehicle cliff-ascent blocking rules as
  hand-authored terrain metadata.
