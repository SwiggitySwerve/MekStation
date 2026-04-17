# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Skirmish Launch Configuration

The system SHALL accept a `ISkirmishLaunchConfig` shape that fully describes a
2v2 BattleMech skirmish and SHALL produce an `InteractiveSession` from it via
the `preBattleSessionBuilder` helper.

#### Scenario: Valid skirmish config launches a session

- **GIVEN** an `ISkirmishLaunchConfig` with two pilot-assigned units per side,
  a map radius in `{5, 8, 12, 17}`, and a terrain preset identifier
- **WHEN** `preBattleSessionBuilder.buildFromSkirmishConfig(config)` is called
- **THEN** the helper SHALL return an `InteractiveSession` in
  `GameStatus.Setup`
- **AND** the session's units SHALL match the four configured units with
  assigned pilots
- **AND** the session's map SHALL have radius and terrain matching the config

#### Scenario: Missing pilot blocks launch

- **GIVEN** an `ISkirmishLaunchConfig` where one unit has no pilot assigned
- **WHEN** `preBattleSessionBuilder.buildFromSkirmishConfig(config)` is called
- **THEN** the helper SHALL throw a validation error
  `"Pilot required for unit <designation>"`
- **AND** no session SHALL be created

#### Scenario: Unsupported radius rejected

- **GIVEN** an `ISkirmishLaunchConfig` with `mapRadius = 3`
- **WHEN** the config is validated before launch
- **THEN** validation SHALL fail with
  `"Map radius 3 not in supported set {5, 8, 12, 17}"`

### Requirement: Deployment Zone Derivation

The system SHALL derive per-side deployment zones from the map radius and
terrain preset at launch time, so the UI and the engine agree on starting
hexes.

#### Scenario: Opposing-edge deployment zones for Open preset

- **GIVEN** a skirmish config with terrain preset `"Open"` and radius 8
- **WHEN** deployment zones are derived
- **THEN** the Player zone SHALL be a contiguous band of hexes along the
  western edge
- **AND** the Opponent zone SHALL be the mirrored band along the eastern
  edge
- **AND** no hex SHALL belong to both zones

#### Scenario: Deployment zones scale with radius

- **GIVEN** the same terrain preset applied at radius 5 versus radius 17
- **WHEN** deployment zones are derived for each
- **THEN** the absolute hex counts SHALL differ
- **AND** the relative edge bands SHALL remain on the same facing edges

### Requirement: Encounter Launch Status Transition

The system SHALL transition an encounter record from `ready` to `launched`
when a skirmish session is built from its config, and SHALL store the
resulting session id on the encounter for round-trip navigation.

#### Scenario: Successful launch updates encounter

- **GIVEN** an encounter in status `ready` with a valid
  `ISkirmishLaunchConfig` attached
- **WHEN** the launch handshake succeeds
- **THEN** the encounter SHALL transition to status `launched`
- **AND** the encounter's `sessionId` SHALL equal the new session's id

#### Scenario: Launch of already-launched encounter rejected

- **GIVEN** an encounter already in status `launched`
- **WHEN** the launch handshake runs again
- **THEN** the handshake SHALL reject with
  `"Encounter already launched"`
- **AND** no new session SHALL be created
