## ADDED Requirements

### Requirement: EMP-Gated Heat Startup

During heat resolution, a shut-down unit SHALL remain shut down and SHALL NOT
emit a StartupAttempt while empShutdownTurns is positive. Both the session and
standalone runner SHALL decrement the timer once per new turn, clamped at zero.
When the timer reaches zero and heat is below HEAT_THRESHOLDS.AUTO_SHUTDOWN,
the unit SHALL use the existing automatic or rolled startup target. A KO pilot
SHALL fail a required startup roll without consuming startup dice; automatic
startup below the shutdown-check threshold SHALL remain permitted.

#### Scenario: EMP duration expires

- **GIVEN** an EMP-shut-down unit with two rounds remaining
- **WHEN** heat resolves before expiry
- **THEN** no startup event or startup dice SHALL occur
- **WHEN** two subsequent new-turn boundaries reduce the timer to zero
- **THEN** startup SHALL be eligible at that turn's heat resolution

#### Scenario: KO pilot cannot roll startup

- **GIVEN** a shut-down unit with zero EMP rounds and a KO pilot
- **WHEN** heat requires a startup roll
- **THEN** startup SHALL fail without consuming startup dice
- **AND** automatic startup at heat below the shutdown-check threshold SHALL
  remain permitted

### Requirement: Exclusive Heat Shutdown Checks

Heat resolution SHALL select startup or shutdown checking from the unit's
pre-startup state. An already-shut-down unit, including one that just restarted,
SHALL NOT make a shutdown check in the same heat resolution. Recorded journals
SHALL continue to apply recorded StartupAttempt.success values without
recalculating startup eligibility.

#### Scenario: Restart does not trigger another shutdown check

- **GIVEN** a shut-down unit eligible for rolled startup
- **WHEN** its startup attempt succeeds or fails
- **THEN** no second shutdown roll, ShutdownCheck event, or shutdown PSR SHALL
  be added during that heat resolution

#### Scenario: Old premature startup remains authoritative

- **GIVEN** recorded EMP shutdown and successful StartupAttempt events before expiry
- **WHEN** the journal is replayed or recovered
- **THEN** the recorded successful startup SHALL still clear shutdown
- **AND** subsequent live resolution SHALL follow EMP-Gated Heat Startup
