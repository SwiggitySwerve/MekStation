# dice-system Specification Delta

## ADDED Requirements

### Requirement: Crypto-Backed Server DiceRoller

The dice system SHALL expose a cryptographically strong `DiceRoller`
factory suitable for server-authoritative play, distinct from the
default Math.random-backed roller used client-side.

#### Scenario: Crypto roller factory exists

- **GIVEN** the dice system's exports
- **WHEN** inspected
- **THEN** a `createCryptoDiceRoller()` factory SHALL be available
- **AND** rollers from this factory SHALL use `crypto.randomBytes` (or
  an equivalent cryptographic primitive)

#### Scenario: Crypto roller satisfies DiceRoller contract

- **GIVEN** a crypto roller
- **WHEN** called
- **THEN** the return value SHALL satisfy the existing `DiceRoller`
  type (`dice`, `total`, `isSnakeEyes`, `isBoxcars`)
- **AND** each die value SHALL be in `[1, 6]`

#### Scenario: Crypto roller avoids modulo bias

- **GIVEN** a uniform byte stream input
- **WHEN** the roller converts bytes into d6 values
- **THEN** it SHALL use rejection sampling (or equivalent) to avoid
  modulo bias
- **AND** a sample of 100,000 rolls SHALL have each face appear within
  a 1% tolerance of 1/6

### Requirement: Recording DiceRoller Wrapper

The dice system SHALL provide a wrapper that captures every roll
produced by an inner roller so the capturing code can attach the rolls
to its emitted event.

#### Scenario: Wrapper captures rolls

- **GIVEN** an inner `DiceRoller` and a `recordingDiceRoller` wrapping
  it
- **WHEN** the wrapper's roller is called three times
- **THEN** the wrapper's `collected` array SHALL contain three entries
  in call order
- **AND** each entry SHALL contain the raw dice values

#### Scenario: Wrapper is transparent to callers

- **GIVEN** a function that accepts a `DiceRoller`
- **WHEN** it is called with a wrapper
- **THEN** the function SHALL behave identically to being called with
  the inner roller
- **AND** the only side effect SHALL be the wrapper's captured array
  growing

### Requirement: Client Must Not Generate Rolls in Networked Matches

The system SHALL forbid client-side dice generation for any session
with a non-null `hostPlayerId` (i.e., a server-authoritative session);
client-side code paths SHALL NOT call any `DiceRoller` directly, and
display values SHALL come from event payloads.

#### Scenario: Client renders rolls from event

- **GIVEN** a networked match and an `AttackResolved` event with
  `payload.rolls = [8, 7, 3]`
- **WHEN** the client renders the attack result
- **THEN** the displayed attack roll SHALL be `8`, hit location `7`,
  crit `3`
- **AND** no call to `Math.random` or any local `DiceRoller` SHALL
  occur during rendering

#### Scenario: Missing rolls logs and fallbacks safely

- **GIVEN** a networked match event that should carry `rolls` but does
  not
- **WHEN** the client renders the event
- **THEN** a console error SHALL be logged with the event's `type`
  and `sequence`
- **AND** the display SHALL show `"?"` rather than a fabricated value
