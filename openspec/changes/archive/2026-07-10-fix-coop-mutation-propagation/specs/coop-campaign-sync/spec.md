## ADDED Requirements

### Requirement: Host Mutations Persist and Propagate

A host-committed campaign mutation in an active co-op session SHALL be persisted to the shared campaign record before the host UI presents it as committed, and connected guests SHALL observe the mutation — at minimum on refetch, and via the campaign sync channel where connected. A persistence failure (including an optimistic-concurrency conflict) SHALL be surfaced to the acting user and SHALL NOT leave the host UI presenting unpersisted state as committed.

#### Scenario: Host day advance reaches the guest

- **GIVEN** an active co-op session with a connected guest
- **WHEN** the host advances the campaign day
- **THEN** the shared campaign record SHALL reflect the new date
- **AND** the guest SHALL observe the new date (on refetch at minimum; via sync push when connected)

#### Scenario: Persistence conflict is loud

- **GIVEN** the campaign persistence write returns a conflict (409) for a host mutation
- **WHEN** automatic resolution (refresh-and-retry against host-authoritative state) does not succeed
- **THEN** the acting user SHALL see an error state
- **AND** the local UI SHALL NOT present the mutation as committed
