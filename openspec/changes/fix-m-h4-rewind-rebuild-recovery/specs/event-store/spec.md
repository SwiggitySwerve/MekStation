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

### Requirement: Coordinated Outcome Correction Target Blocks Only Dead Candidates

The coordinated outcome-correction target SHALL move the campaign candidate named on its saga to `blocked` when it blocks the saga on a non-retryable refusal, and SHALL keep that candidate `building` on a retryable refusal or a crash, because a retry reuses the candidate id persisted on the saga. After acquiring its correction lease and before minting a candidate, it SHALL move to `blocked` every `building` candidate on the campaign stream that has no sealed impact manifest and is not named by any saga that is not `blocked`. It SHALL NOT change a candidate with a sealed manifest, a candidate a non-blocked saga names, or a branch that is not `building`, and SHALL NOT sweep when it did not acquire the lease. It SHALL hold the lease for the whole record and release it on every exit, including a blocked answer and a thrown error.

#### Scenario: A non-retryable refusal blocks the saga and its candidate

- **GIVEN** a target record whose candidate has been minted
- **WHEN** a non-retryable branch refusal escapes a later step
- **THEN** the saga SHALL be `blocked` and its candidate SHALL be `blocked`
- **AND** the lease SHALL be released

#### Scenario: A crash keeps the candidate for the retry

- **GIVEN** a target record that crashed after the candidate id was persisted on the saga
- **WHEN** the record is retried
- **THEN** the candidate SHALL still be `building` and SHALL be reused
- **AND** the lease SHALL have been released after the crash

#### Scenario: Only dead candidates are swept

- **GIVEN** a stranded unsealed candidate no saga names, one a `target-pending` saga names, one only a `blocked` saga names, and one with a sealed manifest
- **WHEN** a new target record mints its candidate
- **THEN** the unnamed unsealed candidate and the one only a `blocked` saga names SHALL be `blocked`
- **AND** the other two and the new candidate SHALL be `building`

#### Scenario: No lease, no sweep

- **GIVEN** a stranded unsealed candidate and a live lease held by another owner
- **WHEN** a target record answers `not-ready`
- **THEN** the stranded candidate SHALL still be `building`

