## ADDED Requirements

### Requirement: P2P full reconnect baseline replaces held history

The guest SHALL persist a full reconnect baseline, hydrate a session from that durable log, and adopt the rebuilt session before returning live. This SHALL replace held interactive history even when the held log is a matching prefix. The guest SHALL NOT append a full baseline onto held interactive history.

#### Scenario: Reloaded guest holds a matching prefix

- **GIVEN** a guest holds twelve events in memory and the same twelve in storage
- **WHEN** the host completes a full twenty-event baseline, including across multiple chunks
- **THEN** the guest SHALL hold exactly the host's twenty events with unique ids and increasing sequences
- **AND** its derived state SHALL equal the host's state
- **AND** persistence SHALL complete before hydration and adoption

#### Scenario: Divergent held history

- **GIVEN** the guest's stored log diverges from a full host baseline
- **WHEN** reconciliation discards the divergent log
- **THEN** the guest SHALL persist the baseline and adopt a rebuilt session through the same recovery path

#### Scenario: Tail replay

- **GIVEN** the guest requested only events after its local cursor
- **WHEN** a matching tail completes
- **THEN** the guest SHALL append admitted tail events without replacing the held session

### Requirement: Gameplay event append identity and order

The shared gameplay append boundary SHALL return the unchanged session for an existing id with identical serialized content, independent of object key order. It SHALL throw a named error for an existing id with different content or a new event whose sequence does not strictly exceed the held tail. These failures SHALL leave the held session unchanged. Increasing sequence gaps SHALL remain accepted.

#### Scenario: Identical event redelivery

- **GIVEN** a session already contains an event
- **WHEN** that event is appended again, including after JSON transport
- **THEN** the boundary SHALL preserve the session, event count, derived state and update timestamp

#### Scenario: Identity collision

- **GIVEN** a session contains an event id
- **WHEN** an event with that id and different content is appended
- **THEN** the boundary SHALL throw GameEventIdCollisionError before mutation

#### Scenario: Out-of-order or occupied sequence

- **GIVEN** a session ends at sequence twenty
- **WHEN** a new event id arrives at sequence twenty or earlier
- **THEN** the boundary SHALL throw GameEventSequenceError before mutation

#### Scenario: New increasing sequence

- **GIVEN** a session ends at sequence twenty
- **WHEN** a new event id arrives at sequence twenty-one or later
- **THEN** the boundary SHALL append it and derive state exactly once
