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

### Requirement: Failed and Stranded Campaign Retroactive Correction Candidates Are Blocked

A campaign retroactive correction SHALL move the candidate it built to `blocked` when replay diverges, verification refuses it, the impact sealer fails, or an unexpected error escapes after the candidate exists, while it still holds the correction lease, and SHALL return the same refusal or rethrow the same error it would have otherwise. A failure to move the candidate SHALL NOT replace that refusal or error. After acquiring its lease and before building its own candidate, a campaign retroactive correction SHALL move every other `building` candidate on the same stream that has no sealed impact manifest to `blocked`. It SHALL NOT change a candidate with a sealed manifest, which awaits activation, SHALL NOT change a branch that is not `building`, and SHALL NOT sweep when it did not acquire the lease.

#### Scenario: Each failure after the candidate exists blocks it

- **GIVEN** a campaign retroactive correction whose candidate has been built
- **WHEN** replay diverges, verification refuses, the sealer throws, or an unexpected error escapes
- **THEN** the candidate SHALL be `blocked`
- **AND** the caller SHALL receive the original typed refusal, or the original error
- **AND** the lease SHALL be released

#### Scenario: A stranded unsealed candidate is blocked by the next correction

- **GIVEN** a `building` candidate with no sealed manifest whose lease was released
- **WHEN** a new correction acquires the lease and seals its own candidate
- **THEN** the stranded candidate SHALL be `blocked`
- **AND** the new candidate SHALL be `building` with a sealed manifest

#### Scenario: A sealed candidate awaiting activation survives

- **GIVEN** a `building` candidate with a sealed manifest
- **WHEN** another correction acquires the lease and commits
- **THEN** the sealed candidate SHALL still be `building`

#### Scenario: No lease, no sweep

- **GIVEN** a stranded unsealed candidate and a live lease held by another owner
- **WHEN** a correction is refused as `correction-lease-held`
- **THEN** the stranded candidate SHALL still be `building`

