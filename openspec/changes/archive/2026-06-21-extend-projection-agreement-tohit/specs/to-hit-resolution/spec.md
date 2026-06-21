# to-hit-resolution Delta — extend-projection-agreement-tohit

## MODIFIED Requirements

### Requirement: To-Hit Forecast Projection

The to-hit resolution system SHALL expose a `forecastToHit(attack)`
projection that returns the complete modifier breakdown and final target
number for a prospective weapon attack, without mutating state and without
rolling dice. The projection SHALL be computed with the SAME semi-guided
TAG context that the engine commit path (`declareAttack`) and the
simulation weapon-attack phase pass into `calculateToHit` — including
semi-guided-ammunition detection, the target's TAG-designated state, the
target's ECM-protected state, and the indirect-fire determination — so that
the projected target number equals the number those paths would compute for
the same attack. The projection SHALL NOT call `calculateToHit` while
omitting the semi-guided TAG context that the commit path supplies.

#### Scenario: Forecast returns per-modifier contribution

- **GIVEN** an attacker with gunnery 4, weapon at medium range, attacker
  moved 2 hexes, target prone, no SPA adjustments, no terrain modifiers
- **WHEN** `forecastToHit(attack)` is called
- **THEN** the result SHALL contain entries for
  `{label, value}` covering base gunnery, range, attacker movement,
  target movement, terrain, heat, and any active SPAs
- **AND** the result SHALL contain a `finalTn` equal to the sum of
  contributions

#### Scenario: Zero-contribution modifiers omitted

- **GIVEN** an attack with zero terrain modifier and zero heat modifier
- **WHEN** `forecastToHit(attack)` is called
- **THEN** the `modifiers` list SHALL omit any entry whose value is 0
- **AND** the `finalTn` SHALL remain correct

#### Scenario: SPA modifiers labeled by SPA name

- **GIVEN** the attacker's pilot has Sniper and Weapon Specialist SPAs
- **WHEN** `forecastToHit(attack)` is called for a weapon matching Weapon
  Specialist's chosen weapon
- **THEN** the modifiers list SHALL contain a `{label: "Sniper", value}`
  entry
- **AND** a `{label: "Weapon Specialist", value: -2}` entry

#### Scenario: Semi-guided TAG context cancels TMM in the projection

- **GIVEN** a semi-guided LRM attack at a TAG-designated target that moved
  enough hexes this turn to earn a positive target-movement modifier, with
  no ECM protection on the target
- **WHEN** the projection computes the target number
- **THEN** the projection SHALL supply the semi-guided TAG context to
  `calculateToHit`
- **AND** the positive target-movement modifier SHALL be cancelled by the
  equal negative semi-guided TAG modifier
- **AND** the projected `finalTn` SHALL equal the target number the engine
  commit path computes for the same attack

#### Scenario: ECM-protected target does not get TMM cancellation in the projection

- **GIVEN** the same semi-guided LRM attack at a TAG-designated moving target
  whose target IS ECM-protected
- **WHEN** the projection computes the target number
- **THEN** the semi-guided TAG cancellation SHALL NOT apply
- **AND** the positive target-movement modifier SHALL remain in the projected
  `finalTn`
- **AND** the projected `finalTn` SHALL still equal the engine commit path's
  number for the same ECM-protected attack
