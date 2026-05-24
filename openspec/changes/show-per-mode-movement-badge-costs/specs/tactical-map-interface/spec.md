# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked.

#### Scenario: Same-hex movement badges show per-mode MP costs

- **GIVEN** a map receives multiple legal movement projections for the same hex
- **AND** those projections have different MP costs
- **WHEN** the destination hex movement badge is rendered
- **THEN** the badge text SHALL display the MP cost for each legal movement mode
  instead of applying one primary cost to every mode
- **AND** mixed legal/blocked same-hex projections SHALL keep blocked mode
  reasons in metadata and tooltip rows while the badge text identifies the legal
  movement choices.
