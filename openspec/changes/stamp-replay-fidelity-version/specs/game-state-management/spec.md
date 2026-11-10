## ADDED Requirements

### Requirement: Immutable producer-rules version
New GameCreated payloads from the shared factory and standalone runner SHALL write replayFidelityVersion 2 from one owner. Absent retained stamps SHALL read as 1 without mutating stored bytes. Explicit invalid or unsupported values SHALL fail validation. Version 2 SHALL carry no exactness guarantee.

#### Scenario: New and retained logs
- **WHEN** either producer creates a log
- **THEN** its creation payload contains version 2
- **AND** importing an unstamped historical log preserves its absent key and original bytes while reading version 1

### Requirement: Published rules never change retroactively
A version number MUST never gain a new rule after shipped code has written it. Each semantic release SHALL increment the writer by exactly one and introduce rules strictly above every previously written version. Tests SHALL reject changed published definitions or minima and a rule keyed on a number an earlier release wrote. R11a release 2 has no new counter rule; C-1c 2b SHALL next write 3 and gate its rule on version >=3, with no separate 2a release.

#### Scenario: Retroactive counter rule is refused
- **GIVEN** the frozen R11a release 2 fixture
- **WHEN** a proposed counter rule is introduced at 2 or the next writer is 4
- **THEN** the release contract test fails
- **AND** the version 2 witness keeps old counter behavior while the version 3 witness admits the proposed rule

### Requirement: Strict schema identity and byte preservation
The baseline GameCreated schema SHALL accept absent, 1 and 2 with a revised parser schemaId, retaining schema version 1. Re-pinned log locks SHALL prove removing only the new creation stamp reproduces old bytes and hashes exactly. The combat-midbattle recording SHALL remain SHA-256 4366ce6cb897f79ea9f75e9b88a48f21db16864e56c58cbe790d7fa72c6833a9.

#### Scenario: Strict parser compatibility
- **WHEN** retained or newly stamped creation payloads are parsed
- **THEN** absent, 1 and 2 parse without backfill and invalid/future values fail
- **AND** the pipeline fingerprint reflects only the declared parser identity change

### Requirement: Reload required for unsupported readers
SessionJoin SHALL advertise replayFidelityReaderMaxVersion; absence SHALL mean 1. After authorization, the host SHALL refuse a reader below the stored producer version before sending any seed, using existing Error code PROTOCOL_VIOLATION and reason `reload-required: Reload this tab to join this match.` Updated UI SHALL show terminal reload-required with a Reload action and SHALL NOT remain Joining/Loading, acknowledge a rejected seed or reconnect indefinitely. Local unsupported strict-reader failures SHALL remain distinct from corrupt history in mirror, cold recovery and Replay Library adapters.

#### Scenario: Old tab joins a new host
- **GIVEN** an authorized reader with absent capability and a version 2 host
- **WHEN** it joins
- **THEN** it receives the old-understood reload-required error and no replay frames
- **AND** an updated reader can join, a legacy version 1 match remains joinable, and unauthorized callers receive only their authorization refusal

#### Scenario: Unexpected future local seed
- **WHEN** a strict local reader encounters an unsupported producer-rules version
- **THEN** it reports reload-required instead of invalid-history or a silent pending mirror
