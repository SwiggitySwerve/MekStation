## ADDED Requirements

### Requirement: Authenticated Membership Precedes Socket Attachment
The multiplayer server SHALL resolve authenticated durable session membership before registering a connection as a replay or fan-out recipient. Client-supplied role, seat, campaign, match, or force ownership claims SHALL NOT establish authority.

#### Scenario: Known participant attaches
- **WHEN** an authenticated GM or player presents a valid scoped session token whose identity matches durable membership
- **THEN** the server SHALL bind the connection to that membership and its authorized viewer context

#### Scenario: Unknown or revoked participant is rejected
- **WHEN** identity or membership is unknown, revoked, mismatched, or expired
- **THEN** the server SHALL reject the handshake before the socket receives baseline, replay, or live frames

#### Scenario: Session token is reminted after login
- **WHEN** a participant cold-reloads after the prior scoped token expires
- **THEN** account or vault reauthentication plus durable membership lookup SHALL mint a new scoped token without placing a bearer token in the URL

### Requirement: Per-Session Command Execution Is Serialized
The multiplayer server SHALL execute accepted-intent evaluation and atomic event-batch commit through one serialized queue per match or campaign session, while unrelated sessions MAY progress independently.

#### Scenario: Concurrent player intents do not interleave
- **WHEN** Player 1 and Player 2 submit legal intents concurrently
- **THEN** the server SHALL establish one deterministic command order and SHALL not interleave the derived event batches

#### Scenario: Unrelated sessions progress independently
- **WHEN** one session has a slow command transaction
- **THEN** the server SHALL NOT serialize all other sessions behind it

### Requirement: Commit Precedes Recipient Publication
The multiplayer server SHALL publish committed results only from durable publication records created in the same transaction as the authoritative command batch.

#### Scenario: Persistence failure yields no success frame
- **WHEN** the event-batch transaction fails
- **THEN** the server SHALL send a truthful typed failure and SHALL send no committed-result frame

#### Scenario: Crash after commit resumes publication
- **WHEN** the process fails after commit but before all socket sends
- **THEN** restart recovery SHALL resume at-least-once publication from durable records and cursors without re-executing the command

### Requirement: Durable Active Bindings Survive Invite Expiry
After authenticated join, the server SHALL persist participant-to-campaign-session and participant-to-match bindings independently of the short-lived invite code.

#### Scenario: Active route cold-recovers
- **WHEN** an active participant reloads after the invite code expired
- **THEN** the server SHALL resolve the durable session and match identity and SHALL restore authorized state

#### Scenario: Expired invite rejects a newcomer
- **WHEN** an identity without membership attempts to use the expired invite
- **THEN** the server SHALL reject admission without affecting existing participant bindings

### Requirement: Per-Connection Backpressure Is Bounded
Each connection SHALL have an independent bounded send queue. Queue saturation or socket failure SHALL NOT delay command commit or eligible delivery to healthy recipients.

#### Scenario: Slow player enters behind state
- **WHEN** a player's queue reaches the configured limit
- **THEN** the server SHALL stop unbounded enqueueing, mark that participant behind, and preserve the durable cursor for resynchronization

#### Scenario: Healthy recipients continue
- **WHEN** one player is behind or its socket send fails
- **THEN** eligible committed events SHALL continue to the GM and other healthy player

#### Scenario: Progression remains convergence-gated
- **WHEN** a player remains behind at a scenario or correction boundary
- **THEN** delivery to healthy clients SHALL continue but launch of the next scenario SHALL remain blocked until convergence or audited GM removal

### Requirement: GM Loss Pauses Without Authority Migration
The non-playing GM connection owns campaign authority. Loss of that connection SHALL place the session in a durable paused state and SHALL NOT promote a tactical player to GM.

#### Scenario: Same GM resumes
- **WHEN** the same authenticated GM reconnects
- **THEN** the server SHALL restore GM authority and MAY resume after cursor convergence

#### Scenario: Player cannot inherit GM authority
- **WHEN** Player 1 or Player 2 remains connected after GM loss
- **THEN** that player SHALL retain only player authority and SHALL not execute GM commands
