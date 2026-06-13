# tactical-map-interface Delta — extend-projection-agreement-tohit

## MODIFIED Requirements

### Requirement: To-Hit Forecast Modal

The tactical map interface SHALL provide a modal surface that displays the
breakdown of to-hit modifiers for each selected weapon and the final TN
for each, based on the `forecastToHit` projection from
`to-hit-resolution`. The modal SHALL source the attacker and target to-hit
state from the SAME shared engine state builders the commit path uses
(`buildWeaponAttackAttackerToHitState` / `buildWeaponAttackTargetToHitState`)
rather than a hand-built state, so that pilot wounds, sensor hits, actuator
damage, SPAs, quirks, target-immobile, and target-partial-cover all reach the
forecast. The modal SHALL pass the same semi-guided TAG context the commit path
passes, so that each displayed final TN equals the number the attack would
resolve at.

#### Scenario: Modal opens from Preview Forecast

- **GIVEN** a valid attack plan with at least one selected weapon
- **WHEN** the player clicks "Preview Forecast"
- **THEN** the modal SHALL open centered over the combat surface
- **AND** each selected weapon SHALL render a row with the final TN and
  an expandable modifier breakdown

#### Scenario: Modifier breakdown expands

- **GIVEN** the modal is open and a weapon row is collapsed
- **WHEN** the player clicks the row
- **THEN** the row SHALL expand to show per-modifier labels and signed
  integer values
- **AND** zero-value modifiers SHALL be omitted from the breakdown

#### Scenario: Hit probability shown per weapon

- **GIVEN** a weapon with final TN 8
- **WHEN** the modal renders
- **THEN** the row SHALL display the probability from `hitProbability(8)`
  formatted as a percentage (e.g., `"41.7%"`)

#### Scenario: Modal footer shows expected hits

- **GIVEN** three selected weapons with probabilities 0.9, 0.5, 0.1
- **WHEN** the modal renders
- **THEN** the footer SHALL display `"Expected hits: 1.5"` (sum of
  probabilities rounded to 1 decimal)

#### Scenario: Modal honors full attacker state, not a lossy subset

- **GIVEN** a selected attacker whose pilot has 2 wounds, 1 sensor hit, a
  damaged actuator, and a relevant SPA, firing at a target in partial cover
- **WHEN** the forecast modal renders the weapon rows
- **THEN** the modal SHALL build the to-hit state via the shared engine state
  builders
- **AND** the displayed final TN SHALL include the wound, sensor, actuator,
  SPA, and partial-cover contributions
- **AND** the displayed final TN SHALL equal the number the engine would
  record on commit for the same attack

#### Scenario: Modal honors semi-guided TAG context for a moving target

- **GIVEN** a semi-guided LRM selected against a TAG-designated target that
  moved this turn, with no ECM protection
- **WHEN** the forecast modal renders that weapon's row
- **THEN** the displayed final TN SHALL reflect the cancelled target-movement
  modifier
- **AND** the displayed final TN SHALL equal the number the attack resolves at
  on commit
