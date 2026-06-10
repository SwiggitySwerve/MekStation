# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose movement mode, reachability, MP cost, terrain
cost, elevation delta/cost, heat impact, path details, and blocked or invalid
destination reasons needed to understand movement legality before the player
commits.

#### Scenario: Movement hover explains projected cost context

- **GIVEN** a movement projection includes terrain cost, elevation cost, heat, or path details
- **WHEN** the player inspects movement hover context for the destination hex
- **THEN** the tooltip SHALL show the represented movement cost, heat, and path details
- **AND** the same metadata SHALL expose movement type, movement mode, reachability, MP cost, terrain cost, elevation delta/cost, heat generated, and path coordinates through stable machine-readable attributes when represented
- **AND** movement-only and combined movement+combat tactical hover context SHALL expose the same movement cost facts
- **AND** movement cost rows SHALL expose the shared movement projection source references and MegaMek-backed rule references that support the movement projection
- **AND** the UI SHALL read this context from `IMovementRangeHex` and the shared tactical projection rather than recalculating movement costs locally
