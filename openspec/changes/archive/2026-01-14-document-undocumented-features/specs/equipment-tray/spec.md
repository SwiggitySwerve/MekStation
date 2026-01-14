## MODIFIED Requirements

### Requirement: Equipment Removal

The Equipment Tray SHALL allow users to remove equipment using a click-to-confirm pattern.

#### Scenario: Single item removal with confirmation

- **WHEN** user clicks the remove (X) button on a removable equipment item
- **THEN** button displays confirmation indicator (?)
- **AND** clicking again within 3 seconds removes the item
- **AND** item disappears from tray
- **AND** statistics update immediately

#### Scenario: Confirmation timeout

- **WHEN** user clicks the remove button showing confirmation indicator
- **AND** 3 seconds pass without a second click
- **THEN** confirmation state resets to normal remove button
- **AND** item remains in tray

#### Scenario: Confirmation cancel on blur

- **WHEN** confirmation indicator is showing
- **AND** user clicks elsewhere in the interface
- **THEN** confirmation state resets to normal remove button

#### Scenario: Non-removable configuration components

- **WHEN** user views a configuration component (engine, gyro, structure, armor type)
- **THEN** remove button is NOT displayed
- **AND** tooltip shows which tab manages that component

#### Scenario: Fixed OmniMech equipment

- **WHEN** unit is an OmniMech
- **AND** equipment is marked as fixed (not pod-mounted)
- **THEN** remove button is NOT displayed
- **AND** item shows "(Fixed)" suffix
- **AND** opacity is reduced to indicate non-removable status
