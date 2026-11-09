## ADDED Requirements

### Requirement: Distinct Effects Survive Ledger Row Merging

The campaign GM ledger SHALL retain distinct persisted effects of one intervention as distinct rows when merging them with session history. A session approval SHALL replace at most one persisted row of that intervention and its private metadata SHALL appear once. Rendered row identifiers SHALL be unique. Persisted rows without an intervention id SHALL remain visible. With no session history, all persisted effects SHALL remain visible through player-safe projection.

#### Scenario: Repair completion has two saved effects
- **GIVEN** a repair approval with persisted repair-ticket and base-unit-state effects sharing one intervention id and one session approval row
- **WHEN** the ledger merges saved and session rows
- **THEN** both effects SHALL remain distinct with unique row identifiers
- **AND** the private approval metadata SHALL appear once and SHALL NOT enter the player projection

#### Scenario: Reload and legacy saves
- **GIVEN** persisted multi-effect interventions and legacy rows without intervention ids
- **WHEN** the campaign reloads without session history
- **THEN** all persisted rows SHALL remain visible with their distinct identities and player-safe summaries
