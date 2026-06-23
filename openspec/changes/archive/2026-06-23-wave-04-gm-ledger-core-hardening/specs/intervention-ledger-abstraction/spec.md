## ADDED Requirements

### Requirement: Immutable Ledger Read Snapshots

The intervention ledger system SHALL preserve append-only history by returning immutable top-level record snapshots from read and projection APIs. Callers SHALL NOT be able to mutate canonical ledger record fields through arrays or records returned by ledger reads.

#### Scenario: Intervention ledger records cannot be mutated through reads
- **GIVEN** an approved intervention record has been appended
- **WHEN** a caller reads intervention ledger records and attempts to mutate a returned record field
- **THEN** the canonical ledger record SHALL remain unchanged

#### Scenario: Action ledger projections cannot be mutated through reads
- **GIVEN** normal and GM intervention actions have been appended to the shared action ledger
- **WHEN** a caller reads player-public or GM-private projections and attempts to mutate a returned record field
- **THEN** the canonical action ledger record SHALL remain unchanged
