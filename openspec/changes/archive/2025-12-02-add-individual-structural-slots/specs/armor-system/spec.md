## ADDED Requirements

### Requirement: Individual Armor Slot Items

Ferro-Fibrous and similar armor types SHALL create individual equipment items for each required critical slot.

#### Scenario: Ferro-Fibrous IS individual slots

- **WHEN** using Inner Sphere Ferro-Fibrous armor
- **THEN** system SHALL create 14 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`
- **AND** each item SHALL have unique `instanceId`
- **AND** each item SHALL have `equipmentId` starting with `armor-slot`
- **AND** each item SHALL have `isRemovable: false`

#### Scenario: Ferro-Fibrous Clan individual slots

- **WHEN** using Clan Ferro-Fibrous armor
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Light Ferro individual slots

- **WHEN** using Light Ferro-Fibrous armor
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Heavy Ferro individual slots

- **WHEN** using Heavy Ferro-Fibrous armor
- **THEN** system SHALL create 21 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Standard armor no slots

- **WHEN** using Standard armor
- **THEN** system SHALL NOT create any equipment items
- **AND** critical slots requirement is 0

### Requirement: Stealth Armor Fixed Placement

Stealth armor SHALL create 2-slot components with pre-assigned locations.

#### Scenario: Stealth armor slot creation

- **WHEN** using Stealth armor
- **THEN** system SHALL create 6 equipment items
- **AND** each item SHALL have `criticalSlots: 2`
- **AND** each item SHALL have `name: 'Stealth'`

#### Scenario: Stealth armor locations

- **WHEN** Stealth armor items are created
- **THEN** one item SHALL be assigned to Left Arm
- **AND** one item SHALL be assigned to Right Arm
- **AND** one item SHALL be assigned to Left Torso
- **AND** one item SHALL be assigned to Right Torso
- **AND** one item SHALL be assigned to Left Leg
- **AND** one item SHALL be assigned to Right Leg

### Requirement: Armor Slot Equipment Sync

Armor equipment items SHALL be synchronized when armor type changes.

#### Scenario: Type change removes old slots

- **WHEN** armor type is changed
- **THEN** all existing armor slot equipment SHALL be removed
- **AND** new armor slot equipment SHALL be created for new type

#### Scenario: Switch to standard clears slots

- **WHEN** switching from Ferro-Fibrous to Standard
- **THEN** all Ferro-Fibrous equipment items SHALL be removed
- **AND** no new armor equipment items SHALL be created
