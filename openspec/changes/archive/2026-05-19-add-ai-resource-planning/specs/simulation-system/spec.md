## ADDED Requirements

### Requirement: Resource-Planning Tier Parameters

The AI Difficulty Tier Registry SHALL carry a resource parameter block on each tier, exposing `heatLookaheadTurns`, `ammoConservationWeight`, `critSeekingWeight`, and `weaponModeSelection`. The `Green` and `Regular` tiers SHALL set `heatLookaheadTurns` to `0`, zero the conservation and crit-seeking weights, and set `weaponModeSelection` to `false`, leaving all resource-planning behavior inert. The `Veteran` and `Elite` tiers SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement parameter block.

#### Scenario: Every tier resolves a resource block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the resource parameter block is read for each
- **THEN** each SHALL return a populated `IAITierResourceParameters` record

#### Scenario: Lower tiers disable resource planning

- **GIVEN** a bot configured with the `Green` or `Regular` tier
- **WHEN** it plans heat, ammo, crit-seeking, and weapon modes
- **THEN** multi-turn heat projection SHALL be skipped, ammo conservation SHALL not alter selection, crit-seeking SHALL contribute zero, and every multi-mode weapon SHALL fire its default mode

### Requirement: Multi-Turn Heat Projection

When `heatLookaheadTurns` is greater than zero, the system SHALL provide `AIHeatPlanner.projectHeat` that projects the unit's heat across the lookahead window from current heat, dissipation, and the per-turn heat the candidate fire list generates, and reports the first turn at which a shutdown risk is predicted. When a shutdown is predicted inside the window, `AttackAI` SHALL lower the effective heat budget so the projected curve flattens. The single-turn heat-budget trim SHALL still run each turn. Heat projection SHALL be a pure deterministic function and SHALL NOT consume `SeededRandom`.

#### Scenario: Rising heat curve flags the shutdown turn

- **GIVEN** a unit whose candidate fire list generates more heat per turn than it dissipates
- **WHEN** `projectHeat` runs over the lookahead window
- **THEN** `shutdownRiskTurn` SHALL be the first turn the projected heat crosses the shutdown ceiling

#### Scenario: Sustainable fire list reports no risk

- **GIVEN** a unit whose candidate fire list generates no more heat than it dissipates
- **WHEN** `projectHeat` runs
- **THEN** `shutdownRiskTurn` SHALL be `-1`

#### Scenario: Veteran bot throttles before shutdown

- **GIVEN** a `Veteran` bot whose alpha strike would shut it down two turns out
- **WHEN** it selects its fire list
- **THEN** the effective heat budget SHALL be lowered and lower-efficiency weapons SHALL be culled
- **AND** the unit SHALL NOT shut down within the lookahead window

### Requirement: Ammo-Runway Projection

When `ammoConservationWeight` is greater than zero, the system SHALL provide `AIAmmoRunway` that estimates, per ammo-dependent weapon, the turns of fire the remaining ammo supports and a conservation multiplier in the range `[0, 1]`. A short runway SHALL lower the weapon's selection priority; a long runway SHALL leave it neutral. Energy weapons SHALL report an infinite runway and a neutral weight. The binary rule that culls a weapon with zero ammo SHALL be unchanged — runway projection SHALL modulate priority only, never eligibility.

#### Scenario: Scarce ammo lowers selection priority

- **GIVEN** an ammo-dependent weapon with only a few turns of fire remaining
- **WHEN** weapon selection runs on a `Veteran` bot
- **THEN** the weapon's selection priority SHALL be reduced
- **AND** the weapon SHALL still be eligible to fire

#### Scenario: Abundant ammo is neutral

- **GIVEN** an ammo-dependent weapon with a long runway of remaining fire
- **WHEN** weapon selection runs
- **THEN** the conservation weight SHALL leave the weapon's priority unchanged

#### Scenario: Energy weapons are unaffected

- **GIVEN** an energy weapon with no ammo dependency
- **WHEN** ammo runway is projected
- **THEN** it SHALL report an infinite runway and a neutral conservation weight

### Requirement: Crit-Seeking Target Weighting

When `critSeekingWeight` is greater than zero, `AttackAI.scoreTarget` SHALL add a crit-seeking term, multiplied by `critSeekingWeight`, that raises a target's score in proportion to its structural exposure — stripped armor, prior internal damage, or an opened location where a crippling critical hit is reachable. A fully-armored target SHALL receive a zero crit-seeking bonus. The existing threat and kill-probability terms SHALL be unchanged; crit-seeking SHALL be additive.

#### Scenario: Exposed target scores higher

- **GIVEN** two targets identical in threat and kill-probability, one with an open side torso and one fully armored
- **WHEN** `scoreTarget` runs on a `Veteran` bot
- **THEN** the open-side-torso target SHALL score higher

#### Scenario: Threat still dominates crit-seeking

- **GIVEN** a near-dead light with an open location and a fresh heavy posing a much larger threat
- **WHEN** `scoreTarget` runs
- **THEN** the threat and kill-probability terms MAY still place the fresh heavy above the light

#### Scenario: Crit-seeking disabled yields the legacy score

- **GIVEN** a bot whose `critSeekingWeight` is zero
- **WHEN** `scoreTarget` runs
- **THEN** the score SHALL equal the pre-change `scoreTarget` output

### Requirement: Multi-Mode Weapon Selection

When `weaponModeSelection` is enabled, the system SHALL provide `AIWeaponModeSelector` that picks, for each multi-mode weapon, the firing mode maximizing expected damage given range, the target's armor state, and the remaining heat budget. The selected mode SHALL be recorded on the declared attack. A weapon without firing-mode metadata SHALL be treated as single-mode and SHALL fire its default mode unchanged.

#### Scenario: LB-X picks cluster against an exposed target

- **GIVEN** an LB-X autocannon and a target with stripped armor or active evasion
- **WHEN** mode selection runs
- **THEN** cluster mode SHALL be selected

#### Scenario: LB-X picks slug against a fresh target

- **GIVEN** an LB-X autocannon and a fresh, fully-armored target at short range
- **WHEN** mode selection runs
- **THEN** slug mode SHALL be selected

#### Scenario: Rate-of-fire weapon drops to single fire under heat pressure

- **GIVEN** an Ultra autocannon and a heat budget that cannot absorb double fire
- **WHEN** mode selection runs
- **THEN** the single-fire mode SHALL be selected

#### Scenario: Single-mode weapon passes through unchanged

- **GIVEN** a weapon with no firing-mode metadata
- **WHEN** mode selection runs
- **THEN** the weapon SHALL fire its default mode
- **AND** the declared attack SHALL match the pre-change behavior
