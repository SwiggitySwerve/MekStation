# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Pre-Battle Force Change Callback

The game-session-management pre-battle configuration handshake SHALL
accept an optional `onForcesChange` callback that fires whenever
either side's force composition changes (add/remove unit, swap pilot,
rename force), enabling the `ForceComparisonPanel` to re-derive its
summary without polling.

#### Scenario: Callback fires on unit addition

- **GIVEN** a pre-battle session with `onForcesChange` subscribed and
  the player side has one mech
- **WHEN** the player adds a second mech to their force
- **THEN** `onForcesChange` SHALL be invoked once with
  `{player: IForceConfig, opponent: IForceConfig}`
- **AND** the new player force config SHALL include both mechs

#### Scenario: Callback fires on pilot swap

- **GIVEN** a pre-battle session with `onForcesChange` subscribed
- **WHEN** the player swaps the pilot assigned to mech A
- **THEN** `onForcesChange` SHALL be invoked with the updated
  `IForceConfig`

#### Scenario: Callback fires on unit removal

- **GIVEN** a pre-battle session with two mechs per side
- **WHEN** the player removes one mech from their force
- **THEN** `onForcesChange` SHALL be invoked with the reduced
  `IForceConfig`

#### Scenario: Callback not invoked for unrelated changes

- **GIVEN** a pre-battle session with `onForcesChange` subscribed
- **WHEN** the player changes the map radius (not a force change)
- **THEN** `onForcesChange` SHALL NOT be invoked

#### Scenario: Callback omission does not affect launch

- **GIVEN** a pre-battle session with no `onForcesChange` supplied
- **WHEN** the player configures forces and launches
- **THEN** the session SHALL launch normally
- **AND** no exception SHALL be thrown

### Requirement: Force Config Stability

The force configuration objects passed to `onForcesChange` SHALL be
immutable snapshots — mutating them SHALL NOT affect the pre-battle
session's internal state.

#### Scenario: Mutation of snapshot does not affect session

- **GIVEN** `onForcesChange` fires with a `player` force config
- **WHEN** the consumer mutates the received config object
- **THEN** the internal pre-battle session state SHALL remain
  unchanged
- **AND** a subsequent `onForcesChange` emission SHALL reflect the
  true session state (not the mutated snapshot)

#### Scenario: Deep-equal snapshots across emissions

- **GIVEN** no force changes occurred between two callback
  invocations (callback was triggered by a different subscriber path)
- **WHEN** the two callbacks are compared
- **THEN** the two snapshots SHALL be deeply equal
