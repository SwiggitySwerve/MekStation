# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Effect Overlays

The system SHALL provide toggleable overlays showing calculated terrain effects.

#### Scenario: Movement cost overlay color-codes terrain cost bands

- **GIVEN** a unit is selected with movement type Walk
- **WHEN** the movement cost overlay is enabled
- **THEN** each hex SHALL display its movement cost in MP
- **AND** 1 MP terrain costs SHALL render with the low-cost green marker fill
- **AND** 2-3 MP terrain costs SHALL render with the medium-cost yellow marker fill
- **AND** 4+ MP terrain costs SHALL render with the high-cost red marker fill
- **AND** movement-cost markers SHALL expose their cost band and fill color from the same terrain movement-cost value used by the visible label
