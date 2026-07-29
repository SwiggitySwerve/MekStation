## ADDED Requirements

### Requirement: Viewer Projection Occurs Before Serialization
Every live, replay, snapshot, cold-recovery, timeline, and export payload SHALL pass through authorization and per-viewer projection before serialization. The server SHALL NOT serialize a raw authoritative payload for later client-side redaction.

#### Scenario: Projector object is player-safe
- **WHEN** the server prepares a player payload before `JSON.stringify` or equivalent serialization
- **THEN** the object SHALL already exclude GM-private reasons, hidden opponent facts, private identifiers, and non-viewer authority metadata

#### Scenario: Projection failure fails closed
- **WHEN** membership lookup, audience classification, or projection fails
- **THEN** the server SHALL send no raw fallback payload and SHALL record a typed projection failure

### Requirement: Global Authority Sequence Is Private
Player projections SHALL use a gapless per-viewer delivery sequence and SHALL NOT expose server-only authority sequence values or inferable gaps caused by hidden events.

#### Scenario: Hidden event does not reveal a gap
- **WHEN** a GM-only or opponent-hidden event advances the authority journal
- **THEN** the player's next authorized frame SHALL continue the player's gapless delivery sequence without revealing the hidden event

### Requirement: GM Drafts Stay in Separate Private Records
Unfinalized GM previews, private reasons, and hidden impact metadata SHALL be stored in server-only records whose authorization is checked before lookup. Player-safe journal or audit rows SHALL contain none of those fields.

#### Scenario: GM previews correction
- **WHEN** the GM opens or modifies a correction or rewind preview
- **THEN** the preview SHALL be available only through an authorized GM path and SHALL not appear in player frames, snapshots, history, or exports

#### Scenario: GM finalizes public correction
- **WHEN** the GM commits a correction
- **THEN** players SHALL receive only the finalized player-safe result while the private record retains authorized reason detail

### Requirement: Player Choices Are Sealed Until Reveal
A tactical player's sealed choice SHALL be visible only to that player and the GM until an authoritative reveal or phase-finalization event.

#### Scenario: Player 1 choice is sealed
- **WHEN** Player 1 submits a sealed choice before reveal
- **THEN** Player 2 SHALL receive no payload or sequence clue that exposes the choice

#### Scenario: Both choices reveal together
- **WHEN** the authority finalizes reveal
- **THEN** each eligible viewer SHALL receive the authorized finalized choices in committed delivery order

### Requirement: Ordinary Public Combat Facts Publish Immediately
Committed public movement, attack, damage, phase, pause, resume, and terminal facts SHALL publish to eligible viewers without a second GM approval step.

#### Scenario: Public attack result commits
- **WHEN** a normal authoritative attack command commits
- **THEN** every eligible viewer SHALL receive its authorized projection immediately from the durable publication path

### Requirement: Visibility Is Equivalent Across Surfaces
For one participant and one authoritative event, live, replay, snapshot, cold recovery, timeline, and export SHALL expose equivalent authorized fields and projection digest.

#### Scenario: Player reconnect parity
- **WHEN** a player receives an event live and later sees it through cold recovery
- **THEN** the authorized payload fields and projection digest SHALL match

#### Scenario: Player export parity
- **WHEN** a player exports history containing the event
- **THEN** the export SHALL contain no field absent from that player's authorized timeline projection

### Requirement: Privacy Proof Covers Raw and Rendered Surfaces
Strict privacy verification SHALL inspect the pre-serialization projection object, raw live frames, raw replay and recovery frames, snapshots, role-scoped audit export, browser history state, and rendered DOM.

#### Scenario: Negative private-data search passes
- **WHEN** the strict GM/P1/P2 sandbox captures all required surfaces
- **THEN** player artifacts SHALL contain no private GM reason, opponent hidden metadata, server-only authority identity, secret event identifier, or inferable delivery gap

#### Scenario: Unauthorized membership sees nothing
- **WHEN** an unknown or revoked identity attempts WebSocket or API access
- **THEN** no baseline, replay, live, audit, or export payload SHALL be disclosed
