# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Target Lock Visualization

The tactical map interface SHALL render a pulsing red target ring around a
locked-in enemy unit token during the Weapon Attack phase, binding the
ring's visibility to `useGameplayStore.attackPlan.targetId`.

**Priority**: Critical

#### Scenario: Target lock pulses red

- **GIVEN** `attackPlan.targetId = "unit-42"` during Weapon Attack phase
- **WHEN** the token for unit-42 renders
- **THEN** a red target ring SHALL pulse around the token
- **AND** the ring stroke width SHALL be 3px

#### Scenario: Clearing target removes ring

- **GIVEN** a target ring is visible
- **WHEN** `attackPlan.targetId` becomes `null`
- **THEN** the ring SHALL disappear within a single re-render

#### Scenario: Target ring only in Weapon Attack phase

- **GIVEN** `attackPlan.targetId` is set but phase is Heat
- **WHEN** the token renders
- **THEN** the red target ring SHALL NOT be visible

### Requirement: To-Hit Forecast Modal

The tactical map interface SHALL provide a modal surface that displays the
breakdown of to-hit modifiers for each selected weapon and the final TN
for each, based on the `forecastToHit` projection from
`to-hit-resolution`.

**Priority**: Critical

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

### Requirement: Waiting-for-Opponent Banner

The tactical map interface SHALL render a dismissible "Waiting for
Opponent..." banner after the Player side confirms fire during Weapon
Attack phase and before `attacks_revealed` fires.

**Priority**: High

#### Scenario: Banner appears on Player confirm fire

- **GIVEN** the Player side appends `AttackDeclared` events for all its
  active units
- **WHEN** the combat surface re-renders
- **THEN** a "Waiting for Opponent..." banner SHALL be visible
- **AND** the weapon selector checkboxes SHALL be disabled

#### Scenario: Banner dismisses on attacks revealed

- **GIVEN** the banner is visible
- **WHEN** the session emits `attacks_revealed`
- **THEN** the banner SHALL dismiss
- **AND** weapon selector checkboxes SHALL remain disabled (locked for
  phase)
