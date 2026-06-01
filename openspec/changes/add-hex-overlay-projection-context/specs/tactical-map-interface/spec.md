# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations. Rendered map highlights SHALL expose
the same projection context needed to explain why the highlight exists.

#### Scenario: Movement overlay exposes projection evidence

**GIVEN** a hex renders a movement highlight from the shared tactical projection
**WHEN** the map renders the visible overlay path
**THEN** the overlay SHALL expose its overlay kind
**AND** the overlay SHALL expose the top-level projection status
**AND** the overlay SHALL expose the movement-channel status
**AND** the overlay SHALL expose projection source metadata
**AND** the overlay SHALL expose the projection explanation
**AND** the overlay SHALL have an accessible label summarizing the highlight

#### Scenario: Mixed movement overlay exposes blocked reasons

**GIVEN** a movement hex contains both reachable and blocked movement options
**WHEN** the map renders the visible overlay path
**THEN** the overlay SHALL expose mixed projection status
**AND** the overlay SHALL expose mixed movement-channel status
**AND** the overlay SHALL expose the blocked reasons used by the shared projection

#### Scenario: Blocked combat overlay exposes projection evidence

**GIVEN** a target hex is present but blocked by combat projection rules
**WHEN** the map renders the visible overlay path
**THEN** the overlay SHALL expose its overlay kind as combat blocked
**AND** the overlay SHALL expose blocked projection status
**AND** the overlay SHALL expose blocked combat-channel status
**AND** the overlay SHALL expose combat source metadata
**AND** the overlay SHALL expose blocked reasons and projection explanation
