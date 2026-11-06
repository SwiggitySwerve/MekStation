## ADDED Requirements

### Requirement: Native Unit Piloting Quirk Identity

The system SHALL recognize the pinned MegaMek unit design quirk ids
`easy_pilot` and `hard_pilot` through the shared unit-quirk membership owner.
Native and legacy spellings SHALL identify the same boolean quirk without
rewriting saved keys, adding duplicate modifiers, or changing the existing
PSR reason, terrain and base-piloting eligibility rules.

#### Scenario: Native unit quirks reach interactive PSR events

- **GIVEN** an ordinary unit with base piloting 5 and a damage PSR
- **WHEN** the unit has the native `easy_pilot` design quirk
- **THEN** the resolved PSR target number SHALL be 4
- **AND** the interactive event SHALL record the -1 quirk modifier
- **WHEN** the unit instead has the native `hard_pilot` design quirk
- **THEN** the target number SHALL be 6 with a +1 quirk modifier

#### Scenario: Native Easy Pilot retains existing eligibility

- **GIVEN** a unit with the native `easy_pilot` design quirk
- **WHEN** its base piloting is greater than 3 and the PSR is terrain or phase damage
- **THEN** the existing Easy Pilot relief SHALL apply
- **WHEN** its base piloting is 3 or the PSR is leg damage or standing up
- **THEN** Easy Pilot SHALL add no relief

#### Scenario: Native and saved spellings are one quirk

- **WHEN** either native id is looked up using its legacy saved spelling or vice versa
- **THEN** the shared membership owner SHALL recognize the same quirk
- **AND** duplicate native and legacy spellings SHALL apply its modifier once
- **AND** unknown ids SHALL retain exact-match behavior without prefix matching
