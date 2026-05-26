# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose the BattleTech movement facts required to
understand walk, run, jump, and unit-type-specific movement legality.

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, stand-up cost and stand-up PSR
state where applicable, and invalid reason when blocked. When live movement
overlays combine multiple projections for the same destination, they SHALL
preserve the per-mode option facts instead of collapsing them into an
unexplained single state.

#### Scenario: Intact Quad Mek stand-up exposes no-PSR reason

- **GIVEN** a prone unit has a represented quad stand-up leg profile
- **AND** no represented quad leg location is destroyed
- **WHEN** the tactical map renders a ground movement destination that requires standing
- **THEN** the hex metadata SHALL expose stand-up cost and `standUpPsrRequired=false`
- **AND** badges, tooltip rows, and projection explanation text SHALL expose the no-PSR automatic-success reason without relying only on color
- **AND** the map SHALL still reserve the stand-up MP before path MP
