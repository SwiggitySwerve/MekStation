## ADDED Requirements

### Requirement: Saved Designs Picker Preserves Campaign Roster Identity

Campaign creation SHALL expose runtime-validated saved BattleMechs separately from stock templates and SHALL preserve a saved design's exact source identity while minting a distinct campaign roster-instance identity.

#### Scenario: Valid saved BattleMech metadata maps exactly

- **GIVEN** the custom-unit index returns a row with a non-empty server id, BattleMech entity type, non-empty display name, and finite positive tonnage
- **WHEN** the campaign adapter validates that row
- **THEN** the Saved Designs option SHALL retain the exact id, display name, and tonnage
- **AND** identity SHALL NOT be inferred from the name, tonnage, ordering, or id prefix

#### Scenario: Invalid custom index metadata is excluded

- **GIVEN** a custom-unit index row has an empty id, non-BattleMech type, empty name, non-finite tonnage, or non-positive tonnage
- **WHEN** the campaign adapter validates Saved Designs
- **THEN** that row SHALL NOT become selectable
- **AND** the group SHALL expose an invalid/unavailable observation without coercion or a construction-payload fallback

#### Scenario: Saved-design source states remain recoverable

- **WHEN** saved designs are loading, empty, invalid, or fail to load
- **THEN** Stock Templates SHALL remain usable
- **AND** Saved Designs SHALL show the matching loading, empty, or error-with-retry state
- **AND** retry SHALL NOT duplicate an already selected roster instance

#### Scenario: Saved design selection separates source and instance identity

- **GIVEN** a valid saved design with id `<customId>`
- **WHEN** the player adds it to the campaign roster
- **THEN** the draft SHALL mint a fresh roster-instance `unitId`
- **AND** `unitRef` SHALL equal `<customId>` and `unitSource` SHALL equal `custom`
- **AND** the root force SHALL contain the roster-instance id
- **AND** no serialized construction payload or representative stock substitution SHALL enter campaign state

#### Scenario: Repeated selection creates distinct roster instances

- **WHEN** the player adds the same saved design twice
- **THEN** the two entries SHALL have distinct roster-instance ids
- **AND** both SHALL retain the same exact `unitRef` and `custom` source kind

#### Scenario: Picker controls are accessible and narrow-safe

- **WHEN** the roster step is used by keyboard at desktop width or 390x844
- **THEN** both group names and every option, add/remove, status, and retry control SHALL have a programmatic name
- **AND** focus order, feedback, and layout SHALL remain visible and operable without hidden or overlapping controls
