# Campaign Access Projection

## ADDED Requirements

### Requirement: Every campaign event carries an access scope assigned at emission
Every event appended to a campaign stream SHALL carry an access scope assigned by the emitting domain logic at append time. The initial scope vocabulary SHALL be: `gm` (Game-Master-only), `campaign` (all participants), `team:<teamId>` (a team/faction's participants), and `player:<participantId>` (a single participant). Scope SHALL be part of the event's canonical bytes (and therefore digest-protected); scope reclassification after append SHALL be expressed as a new event, never by editing history.

#### Scenario: Scope is chosen by domain logic, not by the consumer
- **WHEN** the GM authors a hidden opportunity and a player later discovers it
- **THEN** the authoring event SHALL carry scope `gm`, the discovery SHALL append a revelation event carrying the discovering scope (for example `campaign`), and no consumer-side setting can widen either

### Requirement: The source projects a per-grant filtered stream; consumers never receive out-of-scope events
For each grant, the source SHALL project the campaign stream to exactly the events the grant's scope set includes, before transmission. Events outside the grant's scopes SHALL NOT be transmitted to that consumer in any form — not as placeholders, not as redacted stubs, not as metadata that reveals their type or actor. The GM grant's scope set SHALL include all scopes and therefore receives the full stream, regardless of which device hosts the source.

#### Scenario: A player replica never receives GM-only events
- **WHEN** the source appends events with scopes `gm` and `campaign` while a player replica is connected
- **THEN** the player replica's connection SHALL carry only the `campaign` event, and inspection of the replica's transport traffic and durable store SHALL show no trace of the `gm` event

#### Scenario: GM sees everything
- **WHEN** any event is appended with any scope
- **THEN** the GM grant's stream SHALL include it, and the GM surfaces SHALL be able to render the full unfiltered history

### Requirement: Filtered streams are per-scope contiguous and verifiable without leaking withheld events
Each grant's projected stream SHALL carry its own contiguous per-grant sequence numbers and its own digest chain computed over the projected events, so a consumer can verify completeness and integrity of what it is entitled to see. The projection SHALL NOT expose global stream positions, gaps, or counts from which a consumer could infer the existence, frequency, or timing of withheld events beyond what its own visible events imply.

#### Scenario: Withheld activity is not countable
- **WHEN** the source appends fifty `gm` events between two `campaign` events
- **THEN** a player replica SHALL observe two consecutive per-grant sequence numbers with a valid chain link and SHALL NOT be able to determine that any intervening events existed

#### Scenario: Projection tampering is detectable by the consumer
- **WHEN** a transport intermediary drops or reorders an in-scope event
- **THEN** the replica's per-grant chain verification SHALL fail and the replica SHALL re-request from its last verified cursor

### Requirement: Perspective applies to projections and UI derived from the stream
Replica-side projections (dashboard, missions, starmap, activity log) SHALL be computed only from the events the grant received. Surfaces that would be empty or misleading under a narrow scope SHALL state that the view is a scoped perspective of a shared campaign rather than implying the campaign contains nothing more.

#### Scenario: Scoped activity log labels its perspective
- **WHEN** a player replica renders the campaign activity log
- **THEN** it SHALL show only in-scope entries and SHALL indicate the log reflects that participant's perspective of a shared campaign
