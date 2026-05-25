# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Unit Token Rendering

The system SHALL render unit tokens with facing indicators, selection rings,
target rings, status markers, type-specific visuals, and event-driven damage
feedback overlays through the production per-type token dispatcher. When
weapon-backed combat projection is active for the selected unit, the rendered
valid-target ring SHALL be driven by shared combat projection data instead of
by legacy token flags.

#### Scenario: Production dispatcher owns token feedback overlays

**GIVEN** the tactical map has unit tokens and a relevant game-event log
**WHEN** damage, critical-hit, pilot-hit, or unit-destroyed events target a unit
**THEN** the token SHALL render the corresponding damage-feedback overlay
through `UnitTokenForType`
**AND** no HexMapDisplay-local legacy token renderer SHALL be required to show
those overlays
