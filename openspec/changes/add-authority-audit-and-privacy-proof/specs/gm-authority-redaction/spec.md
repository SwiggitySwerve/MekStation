## ADDED Requirements

### Requirement: Authorized Viewer Projection Precedes Serialization
Every live, replay, snapshot, recovery, history, timeline, and export payload SHALL be produced from an active server-derived viewer context. Raw journal or private-audit rows SHALL remain inside the trusted server boundary. Projection or membership failure SHALL send no raw fallback or delivery identity.

#### Scenario: Authorized player reads unit history
- **WHEN** a player requests history for a durable unit instance in the player's campaign scope
- **THEN** the server SHALL authorize the entity and project every matching fact before serialization
- **AND** the response SHALL omit GM-private, opponent-hidden, and server-only authority fields

#### Scenario: Projection fails
- **WHEN** viewer lookup, entity authorization, audience classification, or projection fails
- **THEN** no raw event, snapshot, history row, or fallback payload SHALL be serialized
- **AND** a typed server-side failure SHALL be recorded

### Requirement: Viewer Delivery Cursors Are Durable and Privacy-Safe
The server SHALL maintain a durable opaque delivery epoch keyed by `(principalId, campaignSessionId, participantId, membershipRevision, streamType, streamId, projectorVersion, effectiveGeneration)`. A viewer cursor SHALL contain that epoch identity and an `afterSequence`. For every request, the server SHALL freshly derive the complete epoch key from the current authorized viewer and requested stream and SHALL resolve the opaque epoch only within that exact key. Sequences SHALL start at 1 and advance gaplessly only after an event successfully produces a visible projection in that epoch. Hidden or failed projections SHALL receive no sequence. The same projected event SHALL reuse its durable internal sequence across reconnect, retry, replay, and pagination. Sequence assignment SHALL atomically persist the event mapping with unique `(deliveryEpochId, projectedEventIdentity)` and `(deliveryEpochId, deliverySequence)` constraints.

#### Scenario: Hidden events occur between visible events
- **WHEN** a viewer's epoch contains visible event A, one or more hidden authority events, and visible event B
- **THEN** A and B SHALL receive adjacent viewer delivery sequences
- **AND** no payload, raw position, missing sequence, or traversal shape SHALL reveal the hidden events

#### Scenario: Viewer reconnects with the same epoch
- **WHEN** the same viewer resumes or replays with the same membership revision, stream, projector version, and effective generation
- **THEN** previously projected events SHALL retain their assigned sequences
- **AND** pagination SHALL continue from the supplied `afterSequence` without duplicate or renumbered delivery identities

#### Scenario: Delivery epoch key changes
- **WHEN** membership revision, projector version, or effective generation differs from the cursor's epoch
- **THEN** the server SHALL return a typed stale-epoch result and establish an explicit new baseline
- **AND** it SHALL NOT silently continue, renumber the prior epoch, or expose a raw journal position

#### Scenario: Cursor is reused across viewer or stream scope
- **WHEN** a cursor is supplied by another principal, participant, campaign session, stream type, or stream ID
- **THEN** exact server-derived epoch-key comparison SHALL reject it without reading or advancing delivery state
- **AND** the response SHALL NOT reveal whether the foreign epoch exists

#### Scenario: Concurrent requests assign the same projected event
- **WHEN** reconnect, retry, replay, or pagination requests concurrently attempt to assign one visible projected event
- **THEN** all successful requests SHALL observe one durable event-to-sequence mapping
- **AND** a transaction conflict or retry SHALL create neither a duplicate sequence nor a reserved gap

#### Scenario: Projection fails before delivery assignment
- **WHEN** an otherwise authorized authority event cannot be projected for the viewer
- **THEN** the server SHALL assign no delivery sequence and SHALL NOT advance the viewer cursor
- **AND** it SHALL serialize no raw fallback

### Requirement: Private Audit Uses a Separate Retention Class
GM-private reasons, drafts, hidden impact detail, and rejection detail SHALL reside in a separate access-controlled storage class. Player-safe rows and digests MAY retain only opaque non-guessable references and SHALL NOT hash private payload content. Every private lookup SHALL recheck current membership/role, record access, and exclude private content from export by default. Private records SHALL support configured retention and audited erasure/redaction without rewriting player-safe authority facts.

#### Scenario: Player inspects public correction
- **WHEN** a correction has an associated GM-private reason
- **THEN** the player SHALL receive only the projected public fact
- **AND** neither the payload, digest, identifier, nor traversal shape SHALL reveal the private reason

#### Scenario: Private record reaches retention boundary
- **WHEN** policy expires or authorizes erasure/redaction of a private record
- **THEN** the private detail SHALL become unavailable according to policy
- **AND** the immutable player-safe fact SHALL retain only a safe unavailable-detail marker or opaque reference state

### Requirement: Privacy Proof Covers Raw and Rendered Surfaces
Strict verification SHALL inspect pre-serialization projection objects, raw live/replay/recovery frames, snapshots, timeline/export output, browser history and storage, and rendered DOM for private or hidden data.

#### Scenario: Three-context negative privacy matrix passes
- **WHEN** isolated GM, Player 1, and Player 2 contexts exercise live, reload, replay, timeline, and export
- **THEN** each player artifact SHALL contain no GM-private reason, opposing hidden fact, raw authority position, secret event identity, or inferable hidden-event gap
- **AND** authorized control facts SHALL remain visible and consistent
