## ADDED Requirements

### Requirement: Structural Equipment Display

The equipment tray SHALL display structural slot items grouped by category.

#### Scenario: Endo Steel display

- **WHEN** Endo Steel is equipped
- **THEN** tray SHALL show under 'Structural' category
- **AND** item count SHALL reflect total slots (e.g., "Endo Steel (IS)" x14)

#### Scenario: Ferro-Fibrous display

- **WHEN** Ferro-Fibrous is equipped
- **THEN** tray SHALL show under 'Structural' category
- **AND** item count SHALL reflect total slots

#### Scenario: Stealth armor display

- **WHEN** Stealth armor is equipped
- **THEN** tray SHALL show 6 'Stealth' items under 'Structural' category
- **AND** each SHALL indicate its assigned location

### Requirement: Non-Removable Structural Items

Structural slot items SHALL NOT be removable via the equipment tray.

#### Scenario: Remove button disabled

- **WHEN** structural equipment item is displayed
- **THEN** remove button SHALL NOT be shown
- **AND** item SHALL display lock icon or visual indicator

#### Scenario: Configuration via tabs

- **WHEN** user wants to change structure/armor type
- **THEN** user SHALL use Structure or Armor configuration tab
- **AND** equipment tray SHALL automatically sync
