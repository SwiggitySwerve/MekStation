## MODIFIED Requirements

### Requirement: Campaign Creation Wizard

The system SHALL provide a multi-step campaign creation wizard with 5 steps: Basic Info, Type, Preset, Roster, and Review. The roster step SHALL expose the four representative canonical BattleMech templates and saved custom BattleMechs as separate named groups. Every selected roster instance SHALL carry a distinct campaign `unitId`, a stable source-design `unitRef`, and a persisted `unitSource` discriminator; a representative template SHALL use `canonical` and a canonical-dataset ref, while a saved design SHALL use `custom` and its exact custom-unit API id. Wizard-created pilots SHALL be registered in the pilot vault with distinct default names.

#### Scenario: Wizard step 1 - Basic Info

- **WHEN** the user opens the campaign creation wizard
- **THEN** a required campaign name input and optional description input are displayed

#### Scenario: Wizard step 2 - Type

- **WHEN** the user completes Basic Info and proceeds
- **THEN** 5 campaign types are displayed as selectable cards with name, icon, and description

#### Scenario: Wizard step 3 - Preset

- **WHEN** the user selects a campaign type and proceeds
- **THEN** 4 presets (Casual, Standard, Full, Custom) are displayed with feature comparison highlights

#### Scenario: Wizard step 4 - Roster

- **WHEN** the user selects a preset and proceeds
- **THEN** Stock Templates with four representative canonical BattleMechs and Saved Designs are displayed as separate named groups

#### Scenario: Wizard step 5 - Review

- **WHEN** the user completes the roster and proceeds
- **THEN** the summary SHALL display the campaign details, type, preset, roster assignments, and create action
- **AND** every representative roster row SHALL retain a canonical-dataset `unitRef` and `canonical` source
- **AND** the summary SHALL show each representative unit's real name, weight, and available Battle Value

#### Scenario: Saved custom BattleMech is added by stable reference

- **GIVEN** the custom-unit API lists a saved BattleMech with id `<customId>`
- **WHEN** the user activates that saved design in the wizard roster step
- **THEN** the draft SHALL mint a new roster-instance `unitId`
- **AND** the draft and submitted roster projection SHALL retain `<customId>` unchanged as `unitRef`
- **AND** the draft and submitted roster projection SHALL retain `custom` as `unitSource`
- **AND** no serialized construction payload SHALL be copied into campaign state

#### Scenario: Two instances can reference one saved design

- **GIVEN** one saved custom BattleMech
- **WHEN** the user adds it twice
- **THEN** the two roster entries SHALL have distinct roster-instance `unitId` values
- **AND** both entries SHALL retain the same saved-design `unitRef`
- **AND** both entries SHALL retain `custom` as their source kind

#### Scenario: Root force preserves the custom roster instance

- **WHEN** a campaign containing a saved custom BattleMech is created
- **THEN** the root force SHALL contain that roster entry's instance `unitId`
- **AND** the roster SHALL retain the custom API id as `unitRef`
- **AND** the roster SHALL retain `custom` as `unitSource`
- **AND** the system SHALL NOT replace it with a representative canonical unit

#### Scenario: Legacy roster projection keeps canonical compatibility

- **GIVEN** a pre-change roster projection without `unitSource`
- **WHEN** campaign persistence loads or migrates that projection
- **THEN** it SHALL normalize to `canonical`
- **AND** runtime code SHALL NOT infer source kind from unit name, tonnage, or id prefix

#### Scenario: Invalid source provenance does not become canonical

- **GIVEN** a persisted roster projection with a present `unitSource` value other than `canonical` or `custom`
- **WHEN** campaign persistence loads or migrates that projection
- **THEN** the raw-boundary parser SHALL return an explicit invalid source resolution and the unit SHALL remain non-launchable
- **AND** the unknown value SHALL NOT enter the typed source field, be automatically rewritten, or be coerced to `canonical`

#### Scenario: Invalid custom index metadata is excluded

- **GIVEN** a custom-unit index row with an empty identity, non-BattleMech type, non-finite tonnage, or non-positive tonnage
- **WHEN** the campaign adapter validates Saved Designs
- **THEN** that row SHALL NOT become selectable
- **AND** the Saved Designs group SHALL report the unavailable/invalid record without trusting its metadata

#### Scenario: Saved-design source states remain recoverable

- **WHEN** saved designs are loading, absent, or fail to load
- **THEN** the four representative stock templates SHALL remain usable
- **AND** the Saved Designs group SHALL show an explicit loading, empty, or error-with-retry state

#### Scenario: Saved-design controls are accessible and narrow-safe

- **WHEN** the roster step is used by keyboard at desktop width or 390×844
- **THEN** the Stock Templates and Saved Designs groups and each add/remove control SHALL have programmatic names
- **AND** focus order, status feedback, and layout SHALL remain usable without hidden or overlapping controls

#### Scenario: Wizard pilots are distinct and vault-registered

- **WHEN** the user adds multiple pilots in the wizard roster step and creates the campaign
- **THEN** each pilot SHALL receive a distinct default name (e.g. "MechWarrior 1", "MechWarrior 2", …)
- **AND** each pilot SHALL be registered in the pilot vault such that the Personnel detail panel resolves progression, abilities, and assignment
