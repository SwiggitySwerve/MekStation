## ADDED Requirements

### Requirement: Explicit cleared equipment selection

The customizer selection store SHALL represent cleared equipment and location selection with explicit null values.

#### Scenario: Clear equipment while a location is selected

- **GIVEN** equipment and a location are selected
- **WHEN** `selectEquipment(null)` is called
- **THEN** both selected equipment and selected location SHALL be null

#### Scenario: Repeat null equipment selection

- **GIVEN** the location selection is already null
- **WHEN** `selectEquipment(null)` is called repeatedly
- **THEN** both selections SHALL remain null
- **AND** the action SHALL NOT write an undefined location
