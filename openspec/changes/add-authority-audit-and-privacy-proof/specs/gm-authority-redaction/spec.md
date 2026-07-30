## ADDED Requirements

### Requirement: Authorized Viewer Projection Precedes Serialization
Every live, replay, snapshot, recovery, history, timeline, and export payload SHALL be produced from an active server-derived viewer context. Raw journal or private-audit rows SHALL remain inside the trusted server boundary. Projection or membership failure SHALL send no raw fallback, and each viewer SHALL receive a gapless delivery identity that reveals no hidden authority gaps.

#### Scenario: Authorized player reads unit history
- **WHEN** a player requests history for a durable unit instance in the player's campaign scope
- **THEN** the server SHALL authorize the entity and project every matching fact before serialization
- **AND** the response SHALL omit GM-private, opponent-hidden, and server-only authority fields

#### Scenario: Projection fails
- **WHEN** viewer lookup, entity authorization, audience classification, or projection fails
- **THEN** no raw event, snapshot, history row, or fallback payload SHALL be serialized
- **AND** a typed server-side failure SHALL be recorded

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
