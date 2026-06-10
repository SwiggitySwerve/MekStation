# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose movement mode, reachability, MP cost, terrain
cost, elevation delta/cost, heat impact, path details, stand-up requirements,
stand-up PSR details, and blocked or invalid destination reasons needed to
understand movement legality before the player commits.

#### Scenario: Movement hover explains stand-up context

- **GIVEN** a movement projection includes stand-up cost, stand-up PSR, impossible stand-up, or stand-up modifier details
- **WHEN** the player inspects movement hover context for the destination hex
- **THEN** the tooltip SHALL show the represented stand-up cost, PSR target or impossible reason, and modifier details when present
- **AND** the same metadata SHALL expose stand-up mode, stand-up cost, PSR requirement, PSR reason, finite PSR target number, PSR modifier, impossible reason, and modifier details through stable machine-readable attributes when represented
- **AND** movement-only and combined movement+combat tactical hover context SHALL expose the same stand-up facts
- **AND** stand-up rows SHALL expose shared movement projection source references plus stand-up-specific MegaMek-backed rule references when stand-up context is represented
- **AND** the UI SHALL read this context from `IMovementRangeHex` and the shared tactical projection rather than recalculating stand-up movement rules locally
