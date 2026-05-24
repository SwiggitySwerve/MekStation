# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked.

#### Scenario: Same-hex movement summaries expose per-mode heat impact

- **GIVEN** a map receives multiple movement projections for the same hex
- **AND** those projections differ by generated heat
- **WHEN** the destination hex, movement badge, or movement option tooltip rows
  are rendered
- **THEN** each surface SHALL expose the per-mode generated heat summary
- **AND** the visible heat badge SHALL show the maximum reachable option heat
  without recalculating movement legality outside the shared movement
  projection.
