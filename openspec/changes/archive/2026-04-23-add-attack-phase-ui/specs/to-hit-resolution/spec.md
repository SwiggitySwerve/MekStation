# to-hit-resolution Specification Delta

## ADDED Requirements

### Requirement: To-Hit Forecast Projection

The to-hit resolution system SHALL expose a `forecastToHit(attack)`
projection that returns the complete modifier breakdown and final target
number for a prospective weapon attack, without mutating state and without
rolling dice.

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

### Requirement: Hit Probability Derivation

The to-hit resolution system SHALL expose a `hitProbability(finalTn)`
helper that returns the probability of rolling at least `finalTn` on 2d6,
so the UI can display expected hit counts without implementing dice
probability locally.

#### Scenario: Probability for TN 7

- **GIVEN** `finalTn = 7`
- **WHEN** `hitProbability(7)` is called
- **THEN** the result SHALL equal 21/36 (≈ 0.583)

#### Scenario: Probability for TN 12

- **GIVEN** `finalTn = 12`
- **WHEN** `hitProbability(12)` is called
- **THEN** the result SHALL equal 1/36 (≈ 0.028)

#### Scenario: Probability clamped for TN below 2

- **GIVEN** `finalTn = 1`
- **WHEN** `hitProbability(1)` is called
- **THEN** the result SHALL equal 1.0 (guaranteed hit)

#### Scenario: Probability for TN above 12 returns zero

- **GIVEN** `finalTn = 13`
- **WHEN** `hitProbability(13)` is called
- **THEN** the result SHALL equal 0.0 (impossible)
