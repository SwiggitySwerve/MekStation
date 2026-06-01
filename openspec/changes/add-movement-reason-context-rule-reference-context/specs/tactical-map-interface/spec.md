# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose movement mode, reachability, MP cost, terrain
cost, elevation delta/cost, heat impact, path details, and blocked or invalid
destination reasons needed to understand movement legality before the player
commits.

#### Scenario: Movement hover explains blocked reason context

- **GIVEN** a movement projection rejects a represented movement destination
- **WHEN** the player inspects movement hover context for the destination hex
- **THEN** the tooltip SHALL show the blocked or invalid movement reason
- **AND** the same metadata SHALL expose reachability, movement type, movement mode, blocked reason, engine invalid reason, engine invalid details, and displayed reason through stable machine-readable attributes when represented
- **AND** movement-only and combined movement+combat tactical hover context SHALL expose the same movement reason facts
- **AND** the movement reason row SHALL expose the shared movement projection source references and MegaMek-backed rule references that support the movement projection
- **AND** the UI SHALL read this context from `IMovementRangeHex` and the shared tactical projection rather than recalculating movement legality locally
