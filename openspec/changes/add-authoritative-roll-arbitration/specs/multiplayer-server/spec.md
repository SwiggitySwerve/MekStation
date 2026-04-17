# multiplayer-server Specification Delta

## ADDED Requirements

### Requirement: Authoritative Randomness

The server SHALL be the sole source of randomness in networked matches.
Client intents SHALL NOT carry dice values, and the server SHALL never
trust a value claimed by a client.

#### Scenario: Server generates initiative roll

- **GIVEN** a networked match in the Initiative phase
- **WHEN** the server resolves initiative
- **THEN** the server SHALL use its own `DiceRoller`
- **AND** the resulting dice values SHALL be embedded in the emitted
  `InitiativeRolled` event's `payload.rolls`

#### Scenario: Intent with rolls rejected

- **GIVEN** a client sends an intent whose payload includes `rolls`
- **WHEN** the server validates the intent
- **THEN** the server SHALL respond `Error {code: 'INVALID_INTENT',
reason: 'client-rolls-forbidden'}`
- **AND** no events SHALL be appended

#### Scenario: Crypto-backed roller

- **GIVEN** the server's default `DiceRoller`
- **WHEN** the source is inspected
- **THEN** it SHALL use `crypto.randomBytes` (or an equivalent
  cryptographically strong RNG)
- **AND** it SHALL NOT use `Math.random`

### Requirement: Seeded Debug Mode

The system SHALL allow deterministic play for bug reproduction via an
explicit seed flag, off by default, never permitted in production.

#### Scenario: Seeded mode activates roller

- **GIVEN** the server starts with `MP_DEV_SEED=12345`
- **WHEN** a match is created
- **THEN** the match's `config.seed` SHALL equal `12345`
- **AND** a deterministic roller SHALL be used in place of the crypto
  roller
- **AND** two matches created with the same seed and the same intent
  sequence SHALL produce identical event streams

#### Scenario: Production rejects seed

- **GIVEN** `NODE_ENV=production` and `MP_DEV_SEED` is set
- **WHEN** the server starts
- **THEN** startup SHALL fail with a clear error
- **AND** the process SHALL exit with a non-zero code

### Requirement: Client Cannot Override Rolls

The system SHALL reject any client attempt to submit a `DiceRoller`
override via configuration, intent, or websocket message.

#### Scenario: DiceRoller in config rejected

- **GIVEN** a client creates a match via REST with a body containing
  `config.diceRoller`
- **WHEN** the server validates the request
- **THEN** the field SHALL be stripped or rejected
- **AND** the server's own roller SHALL be used
