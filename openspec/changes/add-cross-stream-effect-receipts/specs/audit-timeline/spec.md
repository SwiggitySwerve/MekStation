## ADDED Requirements

### Requirement: Timeline Traces Cross-Stream Effect Causality
An authorized timeline SHALL trace a source event through outbox delivery, target inbox receipt, and resulting target event range without duplicating authoritative events or exposing records outside the viewer's authorization.

#### Scenario: GM inspects combat-to-campaign result
- **WHEN** the GM opens the outcome timeline
- **THEN** it SHALL show the match outcome identity, delivery state, campaign receipt, and consequence event range
- **AND** each event SHALL retain its owning stream and authority position

#### Scenario: Player inspects the same transition
- **WHEN** a player opens the authorized timeline
- **THEN** the system SHALL project each linked record for that player before composing the response
- **AND** private GM data and hidden-event identifiers SHALL remain absent
