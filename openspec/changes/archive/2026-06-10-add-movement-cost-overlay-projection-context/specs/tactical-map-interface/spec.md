# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose the selected unit's legal, costly, blocked,
and tactically relevant destinations using rules-backed movement projection data
that agrees with engine validation.

#### Scenario: Movement cost overlay carries selected-unit projection context

- **GIVEN** the movement cost overlay is enabled and a hex has a shared tactical map movement projection
- **WHEN** the movement cost marker renders for that hex
- **THEN** the marker SHALL preserve generic terrain movement cost, terrain features, cost band, and elevation metadata
- **AND** the marker SHALL expose the selected-unit projection movement type, movement mode, reachability, MP cost, terrain cost, elevation delta, elevation cost, and heat generated when present
- **AND** blocked or invalid movement reasons SHALL be exposed when the projected movement is rejected
- **AND** the marker accessible label SHALL include both generic terrain cost context and selected-unit projected movement context
- **AND** the marker SHALL read movement details from the shared tactical map projection rather than recalculating destination legality locally
