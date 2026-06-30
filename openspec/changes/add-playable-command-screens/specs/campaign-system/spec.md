## ADDED Requirements

### Requirement: Validated campaign travel action
Campaign travel SHALL be committed through one validated action path that applies current-system changes, time passage, campaign activity, finance effects, and downstream processor consequences together.

#### Scenario: Travel commit applies location and time
- **WHEN** a player approves a legal travel preview
- **THEN** the campaign SHALL update `currentSystemId`, current date, travel activity log, and any configured day-by-day consequences through the same validated commit path

#### Scenario: Travel result persists after reload
- **WHEN** the player reloads the campaign after committed travel
- **THEN** the persisted campaign SHALL retain the destination system, date, activity entries, and downstream state changes shown in the travel preview
