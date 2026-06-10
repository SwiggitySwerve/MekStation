# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

The tactical map interface SHALL visibly distinguish blocked alternate
movement options from legal movement options when multiple movement
projections target the same hex.

#### Scenario: Mixed same-hex movement options show blocked movement types

- **GIVEN** a map receives multiple movement projections for the same hex
- **AND** at least one movement option is reachable
- **AND** at least one alternate movement option is blocked by the movement engine
- **WHEN** the hex is rendered
- **THEN** the legal movement badge SHALL continue to summarize the reachable movement option costs
- **AND** the hex SHALL render a visible blocked movement-option badge identifying the blocked movement type
- **AND** the blocked movement-option badge SHALL expose blocked count, movement types, blocked reasons, invalid reasons, and invalid details from the shared movement projection data
