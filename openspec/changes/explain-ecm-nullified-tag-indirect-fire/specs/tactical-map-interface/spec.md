# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Detail Surface

The tactical map SHALL expose combat projection details from the same
rules-backed combat validation path used by the engine. Blocked combat
projections SHALL explain unavailable indirect-fire fallbacks when that fallback
is tactically relevant to why the attack cannot be committed.

#### Scenario: ECM-nullified TAG explains unavailable semi-guided indirect fire

- **GIVEN** a selected unit has semi-guided LRM fire selected
- **AND** the direct LOS to a TAG-designated target is blocked
- **AND** the target's TAG designation is nullified by ECM
- **WHEN** the map previews the target hex and the player attempts the attack
- **THEN** the combat projection SHALL preserve `NoLineOfSight` as the engine rejection reason
- **AND** the projection, browser metadata, invalid combat badge reason, accessible reason context, and committed `AttackInvalid` event SHALL include that TAG was nullified by ECM and semi-guided indirect fire is unavailable.
