# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL expose rules-backed combat projection details
for range, target legality, LOS, firing arc, visibility, cover, and weapon
availability without recalculating combat legality in the renderer. Hexes that
are reported as LOS blockers by the shared combat projection SHALL also be
classified as tactical projection participants.

#### Scenario: LOS blocker hex projection status is explicit

**GIVEN** a combat projection reports blocked or partial LOS for a target hex
**AND** the LOS classifier identifies an intervening blocker hex
**AND** that blocker hex is not otherwise selected, part of the planned path, a
movement destination, or a combat target
**WHEN** the tactical map builds shared per-hex projections
**THEN** the blocker hex SHALL expose `los-blocker` projection intent
**AND** blocked LOS blockers SHALL expose blocked top-level and combat-channel
projection status
**AND** partial-cover LOS blockers SHALL expose mixed top-level and
combat-channel projection status
**AND** projection reason metadata SHALL include the combat projection's
player-facing LOS blocker reason
**AND** selected, path, movement, and combat-target projection intents SHALL
keep precedence over the standalone LOS-blocker intent
