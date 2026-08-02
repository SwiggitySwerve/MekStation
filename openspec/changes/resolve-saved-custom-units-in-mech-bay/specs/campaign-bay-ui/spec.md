## ADDED Requirements

### Requirement: Mech Bay Resolves Saved Custom Roster Identity Honestly

After a cold reload, campaign Mech Bay SHALL resolve a custom roster entry through its exact saved-design source while preserving its separate roster-instance identity and failing visibly when the source cannot resolve.

#### Scenario: Cold reload resolves exact custom source

- **GIVEN** a persisted roster entry has a roster-instance id, `unitSource=custom`, and saved-design `unitRef`
- **WHEN** the player cold reloads and opens that campaign's Mech Bay
- **THEN** resolution SHALL query saved-design authority by the exact `unitRef`
- **AND** the row SHALL retain its roster-instance id and `custom` source kind
- **AND** canonical stock lookup SHALL NOT substitute or rewrite the entry

#### Scenario: Cached identity metadata remains stable

- **WHEN** the custom roster entry resolves after reload
- **THEN** the displayed name and tonnage SHALL equal the persisted safe cached values
- **AND** any supported BV SHALL be labeled available
- **AND** unsupported or unavailable BV SHALL be labeled unavailable rather than copied from stock data

#### Scenario: Missing saved source stays visible

- **GIVEN** the saved design is deleted, missing, malformed, or unavailable
- **WHEN** Mech Bay resolves the persisted roster
- **THEN** the roster row SHALL remain visible with its cached safe name and tonnage
- **AND** it SHALL show an explicit unresolved-source state
- **AND** it SHALL retain the same roster-instance id and `unitRef`
- **AND** it SHALL NOT borrow stock identity, equipment, BV, or readiness

#### Scenario: Unresolved custom source blocks launch side effects

- **WHEN** an unresolved or unsupported custom roster entry participates in readiness evaluation
- **THEN** mission readiness SHALL identify that exact roster instance as blocked
- **AND** encounter materialization and combat launch side effects SHALL NOT begin for it
- **AND** retry SHALL re-resolve the same source reference without removing or duplicating the roster entry

#### Scenario: Receipt authority is reporter-owned

- **WHEN** CAMP-01G proof runs at reviewed head or exact main
- **THEN** the controller SHALL resolve the immutable row by `commandId=camp-01g`
- **AND** the trusted reporter's closed Mech Bay authority artifact SHALL bind the exact passed browser test to resolved and unresolved observations
- **AND** caller-authored booleans, alternate commands, or screenshots alone SHALL NOT satisfy identity or readiness authority
