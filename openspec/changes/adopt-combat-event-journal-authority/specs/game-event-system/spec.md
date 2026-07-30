## ADDED Requirements

### Requirement: Existing Combat Events Retain Domain Semantics in the Journal
The journal envelope SHALL carry the existing typed `IGameEvent` domain payload without replacing combat reducers or changing legal outcomes. Every committed event SHALL retain its match, actor, visibility, side, replay provenance, schema version, and durable affected-entity links.

#### Scenario: Existing movement event is journaled
- **WHEN** the engine accepts a legal movement command
- **THEN** the committed payload SHALL preserve the existing movement event semantics
- **AND** replay through the existing reducer SHALL produce the same post-movement state as live committed application
