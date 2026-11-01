## MODIFIED Requirements

### Requirement: Canonical Era Definitions

The system SHALL define the fourteen era ranges from mm-data commit
`50f7efef0c9f775b0258f8283525ed4f906e1985`, `data/universe/eras.xml`.
The temporal Era module SHALL own year-to-era classification.
Existing display names MAY remain when they describe the same range.

#### Scenario: Pinned era boundaries

- **WHEN** classifying an integer introduction year
- **THEN** inclusive end years SHALL be 1950, 2004, 2570, 2780, 2900, 3019, 3049, 3061, 3067, 3080, 3100, 3130 and 3150 in source order
- **AND** ilClan SHALL begin in 3151 with no upper boundary
- **AND** 3081 SHALL be Early Republic and 3101 SHALL be Late Republic
- **AND** Dark Age SHALL begin in 3131

## ADDED Requirements

### Requirement: Year-based canonical index era labels

All canonical unit families SHALL derive index era labels from introduction
year through the temporal owner, independent of catalog folder names.
This mapping SHALL NOT rewrite catalog files or alter other mapped fields.

#### Scenario: Folder and year disagree

- **WHEN** a 3069 BattleMech is stored in a Civil War folder
- **THEN** browser and Node indexes, search and era filters SHALL classify it as Jihad

#### Scenario: No usable introduction year

- **WHEN** a row has no positive finite integer numeric introduction year
- **THEN** its index entry SHALL remain available without an era label
- **AND** it SHALL NOT match an era filter or silently default to ilClan
