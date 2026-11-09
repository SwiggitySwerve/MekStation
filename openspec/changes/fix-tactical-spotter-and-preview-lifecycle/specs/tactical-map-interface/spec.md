## ADDED Requirements

### Requirement: Elected Spotters Follow Current Event History

The tactical shell SHALL derive elected spotter pairs from the current session's current-turn IndirectFireSpotterSelected and IndirectFireSpotterLost events in event-list order. It SHALL deduplicate identical pairs and SHALL NOT use a forward-only cursor or separately maintained spotter state.

#### Scenario: Undo or replacement changes spotter visuals
- **GIVEN** a mounted tactical shell with elected spotter pairs
- **WHEN** undo truncates the event list or a replacement session supplies different events
- **THEN** the exposed pairs SHALL reflect only the surviving current-turn events
- **AND** undoing a Lost event SHALL restore its surviving Selected pair

#### Scenario: Rollover and new selection arrive together
- **WHEN** a session update advances the turn and includes a new spotter selection
- **THEN** only the new turn's surviving pairs SHALL be exposed

#### Scenario: Session is cleared
- **WHEN** the current session is absent or has no current-turn spotter events
- **THEN** the shell SHALL expose no elected spotters
