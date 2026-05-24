# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Physical Attack Map Projection Agreement

The tactical map interface SHALL keep physical-attack target highlights, command
preview rows, and committed physical declarations aligned with the represented
physical attack legality projection.

#### Scenario: Push respects represented building identity

**GIVEN** a push target occupies a represented building hex
**WHEN** the physical terrain context can identify the attacker's building and
target's building
**THEN** the push SHALL remain illegal when the attacker is outside the target
building
**AND** the push SHALL remain illegal when attacker and target occupy different
known buildings
**AND** legacy building terrain without known building ids SHALL preserve the
existing coarse occupancy gate without guessing identity
