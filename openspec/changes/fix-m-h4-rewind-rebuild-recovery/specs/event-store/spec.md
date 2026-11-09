## ADDED Requirements

### Requirement: Failed and Stranded Combat Rewind Candidates Are Blocked

A GM combat rewind SHALL move the correction candidate it built to `blocked` when verification refuses it or any later step fails before activation, while it still holds the correction lease, and SHALL return the same refusal or error it would have returned otherwise. After acquiring its lease and before building its own candidate, a combat rewind SHALL move every other `building` candidate on the same stream to `blocked`, because under its live lease no earlier candidate can still be authorized. It SHALL NOT change the status of any branch that is not `building`, and SHALL NOT block the candidate it is building. An activated branch whose live rebuild fails SHALL stay `effective`; `effective -> blocked` is not a legal transition.

#### Scenario: Verification refusal blocks the candidate

- **GIVEN** a combat rewind whose candidate path does not reproduce
- **WHEN** the commit refuses with `candidate-verification-failed`
- **THEN** the candidate SHALL be `blocked`
- **AND** the lease SHALL be released

#### Scenario: Failure before activation blocks the candidate

- **GIVEN** a combat rewind whose candidate has been built
- **WHEN** a later step throws before activation
- **THEN** the candidate SHALL be `blocked`
- **AND** the caller SHALL receive the original error
- **AND** the effective head SHALL be unchanged

#### Scenario: A stranded candidate is blocked by the next rewind

- **GIVEN** a `building` candidate whose lease was released before activation
- **WHEN** a new combat rewind acquires the lease and commits
- **THEN** the stranded candidate SHALL be `blocked`
- **AND** the new candidate SHALL become `effective`

#### Scenario: The current candidate is never swept

- **GIVEN** a stranded `building` candidate on the stream
- **WHEN** a new combat rewind reaches activation
- **THEN** the stranded candidate SHALL be `blocked` and the new candidate SHALL still be `building`

### Requirement: Waiting-Effects Is Reserved

The `waiting-effects` branch status SHALL stay in the status ladder, the transition table and the storage constraint, and no production writer SHALL set it until the cross-stream effect-receipt change defines the unresolved old-generation effect or delivery that a candidate waits on. A candidate that cannot be activated SHALL move from `building` directly to `blocked`.

#### Scenario: The ladder keeps the reserved status

- **GIVEN** the branch status contract
- **WHEN** a reader looks for the status that holds a candidate behind an unresolved effect
- **THEN** `waiting-effects` SHALL be present, documented as reserved, and legal only between `building` and `blocked` or `effective`

