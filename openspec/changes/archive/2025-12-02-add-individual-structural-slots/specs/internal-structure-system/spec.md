## ADDED Requirements

### Requirement: Individual Structure Slot Items

Endo Steel and similar structure types SHALL create individual equipment items for each required critical slot.

#### Scenario: Endo Steel IS individual slots

- **WHEN** using Inner Sphere Endo Steel
- **THEN** system SHALL create 14 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`
- **AND** each item SHALL have unique `instanceId`
- **AND** each item SHALL have `equipmentId` starting with `internal-structure-slot`
- **AND** each item SHALL have `isRemovable: false`

#### Scenario: Endo Steel Clan individual slots

- **WHEN** using Clan Endo Steel
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Endo-Composite individual slots

- **WHEN** using Endo-Composite structure
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Standard structure no slots

- **WHEN** using Standard internal structure
- **THEN** system SHALL NOT create any equipment items
- **AND** critical slots requirement is 0

### Requirement: Structure Slot Equipment Sync

Structure equipment items SHALL be synchronized when internal structure type changes.

#### Scenario: Type change removes old slots

- **WHEN** internal structure type is changed
- **THEN** all existing structure slot equipment SHALL be removed
- **AND** new structure slot equipment SHALL be created for new type

#### Scenario: Switch to standard clears slots

- **WHEN** switching from Endo Steel to Standard
- **THEN** all Endo Steel equipment items SHALL be removed
- **AND** no new structure equipment items SHALL be created
