# to-hit-resolution (delta)

## MODIFIED Requirements

### Requirement: Target Prone Modifier

The system SHALL apply the target-prone modifier based on the attacker's range to the prone target, per TechManual p.113.

When the attacker is in a hex adjacent to the prone target (range ≤ 1 hex), the attacker SHALL receive a -2 to-hit modifier (the prone target is an easier target at melee range). When the attacker is more than 1 hex away, the attacker SHALL receive a +1 to-hit modifier (the prone target is harder to hit at range).

#### Scenario: Adjacent attacker against prone target

- **GIVEN** a target in prone state at hex distance 1 from the attacker
- **WHEN** computing the target-prone modifier
- **THEN** the modifier SHALL be -2

#### Scenario: Attacker 2 hexes away from prone target

- **GIVEN** a target in prone state at hex distance 2 from the attacker
- **WHEN** computing the target-prone modifier
- **THEN** the modifier SHALL be +1

#### Scenario: Attacker at long range against prone target

- **GIVEN** a target in prone state at hex distance 12 from the attacker
- **WHEN** computing the target-prone modifier
- **THEN** the modifier SHALL be +1

#### Scenario: Standing target receives no prone modifier

- **GIVEN** a target that is NOT in the prone state
- **WHEN** computing the target-prone modifier
- **THEN** the modifier SHALL be 0

### Requirement: Target Movement Modifier (TMM)

The system SHALL apply a target-movement modifier based on the number of hexes the target moved this turn, using the TechManual p.115 bracket table.

The bracket table SHALL be: 0-2 hexes → +0, 3-4 → +1, 5-6 → +2, 7-9 → +3, 10-17 → +4, 18-24 → +5, 25 or more → +6.

The previous approximation `ceil(hexesMoved / 5)` SHALL NOT be used.

#### Scenario: Target moved 0 hexes

- **GIVEN** a target that did not move this turn
- **WHEN** computing the TMM
- **THEN** the modifier SHALL be +0

#### Scenario: Target moved 3 hexes

- **GIVEN** a target that moved 3 hexes this turn
- **WHEN** computing the TMM
- **THEN** the modifier SHALL be +1 (from bracket 3-4)

#### Scenario: Target moved 9 hexes

- **GIVEN** a target that moved 9 hexes this turn
- **WHEN** computing the TMM
- **THEN** the modifier SHALL be +3 (from bracket 7-9)

#### Scenario: Target moved 17 hexes

- **GIVEN** a target that moved 17 hexes this turn
- **WHEN** computing the TMM
- **THEN** the modifier SHALL be +4 (from bracket 10-17)

#### Scenario: Target moved 25 hexes

- **GIVEN** a target that moved 25 hexes this turn
- **WHEN** computing the TMM
- **THEN** the modifier SHALL be +6 (from bracket 25+)

#### Scenario: Bracket boundary transitions

- **GIVEN** a target that moved 2 hexes (last value in +0 bracket)
- **WHEN** computing the TMM
- **THEN** the modifier SHALL be +0
- **AND** a target that moved 3 hexes (first value in +1 bracket) SHALL yield +1

### Requirement: Heat Modifiers

The system SHALL apply a cumulative heat-based to-hit penalty using the MegaMek canonical thresholds as the single source of truth.

Thresholds: heat ≥ 8 → +1, heat ≥ 13 → +2, heat ≥ 17 → +3, heat ≥ 24 → +4. Penalties are not additive across thresholds — the highest applicable threshold SHALL determine the modifier.

The duplicate threshold tables previously defined in `src/utils/gameplay/toHit.ts` and `src/types/validation/HeatManagement.ts` SHALL be removed. `src/constants/heat.ts` SHALL be the single source of truth.

#### Scenario: Heat 7 (below first threshold)

- **GIVEN** an attacker with heat 7
- **WHEN** computing the heat to-hit modifier
- **THEN** the modifier SHALL be +0

#### Scenario: Heat 8 (first threshold)

- **GIVEN** an attacker with heat 8
- **WHEN** computing the heat to-hit modifier
- **THEN** the modifier SHALL be +1

#### Scenario: Heat 13 (second threshold)

- **GIVEN** an attacker with heat 13
- **WHEN** computing the heat to-hit modifier
- **THEN** the modifier SHALL be +2

#### Scenario: Heat 17 (third threshold)

- **GIVEN** an attacker with heat 17
- **WHEN** computing the heat to-hit modifier
- **THEN** the modifier SHALL be +3

#### Scenario: Heat 24 (fourth threshold)

- **GIVEN** an attacker with heat 24
- **WHEN** computing the heat to-hit modifier
- **THEN** the modifier SHALL be +4

#### Scenario: Heat 40 (above all thresholds)

- **GIVEN** an attacker with heat 40
- **WHEN** computing the heat to-hit modifier
- **THEN** the modifier SHALL be +4 (max bracket only, not cumulative)
