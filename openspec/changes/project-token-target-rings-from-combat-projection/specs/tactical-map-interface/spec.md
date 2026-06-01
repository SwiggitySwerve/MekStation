# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Unit Token Rendering

The system SHALL render unit tokens with facing indicators, selection rings,
target rings, and status markers. When weapon-backed combat projection is active
for the selected unit, the rendered valid-target ring SHALL be driven by shared
combat projection data instead of by legacy token flags.

#### Scenario: Weapon-backed combat projection owns token target rings

**GIVEN** a selected friendly unit has configured weapon projection data
**AND** an enemy token's legacy `isValidTarget` flag is stale
**WHEN** the tactical map renders unit tokens
**THEN** the enemy token SHALL render its valid-target ring only when its unit id
appears in `ICombatRangeHex.validTargetUnitIds`
**AND** a projection-rejected target SHALL NOT render a valid-target ring
**AND** the rendered token metadata SHALL identify combat projection as the
target-ring source

#### Scenario: Legacy token target ring remains fallback

**GIVEN** the tactical map caller has not supplied configured weapon projection
data for the selected unit
**WHEN** the tactical map renders unit tokens
**THEN** the token valid-target ring SHALL continue to follow
`IUnitToken.isValidTarget`
**AND** the rendered token metadata SHALL identify the token flag as the
target-ring source
