## ADDED Requirements

### Requirement: Tactical Unit Inspector

The tactical map interface SHALL provide unit inspectors for selected friendly units, selected targets, and contextual comparisons.

#### Scenario: Friendly unit inspector shows exact combat state
- **GIVEN** the player selects a friendly unit
- **WHEN** the unit inspector renders
- **THEN** it SHALL show unit name, chassis/variant where available, pilot, movement state, facing, heat, armor/structure summary, weapon readiness, ammo warnings, critical effects, prone/shutdown state, and active phase obligations

#### Scenario: Target inspector respects intel projection
- **GIVEN** the player selects or previews an enemy target
- **WHEN** the target inspector renders
- **THEN** it SHALL show only fields available from the opponent intel projection
- **AND** exact hidden fields SHALL not be recoverable from labels, tooltips, DOM text, ARIA text, or test ids

### Requirement: Record Sheet Drawers

The tactical map interface SHALL provide drill-down drawers for detailed BattleTech unit state without navigating away from combat.

#### Scenario: Armor and structure drawer
- **GIVEN** a unit inspector is open
- **WHEN** the player opens Armor/Structure
- **THEN** the drawer SHALL show location armor points, internal structure points, destroyed locations, transferred damage indicators, and critical damage markers

#### Scenario: Weapons and heat drawer
- **GIVEN** a unit inspector is open
- **WHEN** the player opens Weapons/Heat
- **THEN** the drawer SHALL show weapon list, range bands, heat, ammo/bin availability where applicable, disabled reasons, current heat, heat sinks, shutdown risk, and ammo explosion risk where modeled

### Requirement: Contextual Target Comparison

The tactical map interface SHALL provide a contextual comparison between active unit and target during command preview.

#### Scenario: Weapon preview comparison
- **GIVEN** the player previews a weapon attack
- **WHEN** an enemy target is selected
- **THEN** the comparison panel SHALL show attacker movement modifier, target movement modifier, range band, arc, LOS/cover, weapon selection, total heat, and expected hit/damage summary where available

#### Scenario: Physical preview comparison
- **GIVEN** the player previews a physical attack
- **WHEN** an enemy target is selected
- **THEN** the comparison panel SHALL show valid physical attack types, relative position, required movement state, piloting constraints, expected damage, and fall risk where available

### Requirement: Inspector Pinning and Density

Inspectors SHALL support peek, pinned, expanded, and mobile bottom-sheet density modes.

#### Scenario: Hover peek does not replace pinned selection
- **GIVEN** the player has a pinned selected unit inspector
- **WHEN** the player hovers another unit
- **THEN** the hover peek SHALL appear as a secondary transient summary
- **AND** the pinned inspector SHALL remain the primary detail panel

#### Scenario: Mobile inspector uses tabs
- **GIVEN** the viewport is mobile width
- **WHEN** the unit inspector opens
- **THEN** it SHALL render as a bottom sheet with tabs for Summary, Armor, Weapons, Effects, and Pilot
- **AND** closing the sheet SHALL return focus to the map or triggering token
