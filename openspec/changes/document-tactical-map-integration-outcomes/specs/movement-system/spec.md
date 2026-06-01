# Spec Delta: Movement System

## ADDED Requirements

### Requirement: Integrated Movement Projection Agreement

Movement projection SHALL represent the same destination legality, MP cost,
terrain cost, elevation cost, heat impact, stand-up state, and blocked reason
that committed movement validation and resolution will enforce for represented
unit movement modes.

#### Scenario: Represented movement modes stay preview/commit aligned

- **GIVEN** a represented unit previews walk, run, jump, vehicle-style, VTOL,
  WiGE, naval, hover, tracked, UMU, infantry, prone, or stand-up movement
- **WHEN** the projection marks a destination legal, costly, blocked, or
  unreachable
- **THEN** the committed movement path for the unchanged destination SHALL spend
  the same MP and heat or reject with the same reason
- **AND** terrain and elevation contributors SHALL remain inspectable by the
  player before commit.
