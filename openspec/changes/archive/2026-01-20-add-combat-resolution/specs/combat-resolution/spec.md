# Combat Resolution Specification

## ADDED Requirements

### Requirement: Attack Declaration

The system SHALL validate and record attack declarations.

#### Scenario: Valid attack declaration
- **GIVEN** attacker with loaded weapon, valid target in range and arc
- **WHEN** declaring attack
- **THEN** attack SHALL be accepted
- **AND** ammo (if applicable) SHALL be decremented
- **AND** heat generation SHALL be recorded

#### Scenario: Invalid range
- **GIVEN** target beyond weapon maximum range
- **WHEN** declaring attack
- **THEN** attack SHALL be rejected
- **AND** error message indicates out of range

#### Scenario: Invalid arc
- **GIVEN** target not in weapon's firing arc
- **WHEN** declaring attack
- **THEN** attack SHALL be rejected
- **AND** error message indicates wrong arc

#### Scenario: No ammo
- **GIVEN** ballistic weapon with no remaining ammo
- **WHEN** declaring attack
- **THEN** attack SHALL be rejected
- **AND** error message indicates no ammo

### Requirement: To-Hit Calculation

The system SHALL calculate to-hit numbers with all applicable modifiers.

#### Scenario: Base to-hit
- **GIVEN** an attacker with gunnery skill G
- **WHEN** calculating to-hit
- **THEN** base to-hit number SHALL be G

#### Scenario: Range modifier
- **GIVEN** target at range R from attacker
- **WHEN** calculating range modifier
- **THEN** short range (0-3): +0
- **AND** medium range (4-6): +2
- **AND** long range (7-15): +4

#### Scenario: Attacker movement modifier
- **GIVEN** attacker who moved this turn
- **WHEN** calculating attacker modifier
- **THEN** walked: +1
- **AND** ran: +2
- **AND** jumped: +3
- **AND** stationary: +0

#### Scenario: Target movement modifier (TMM)
- **GIVEN** target who moved this turn
- **WHEN** calculating TMM
- **THEN** TMM = hexes moved / 5 (rounded up), minimum +1 if moved
- **AND** jumped: additional +1
- **AND** stationary: +0

#### Scenario: Heat modifier
- **GIVEN** attacker with current heat H
- **WHEN** calculating heat modifier
- **THEN** heat 0-4: +0
- **AND** heat 5-7: +1
- **AND** heat 8-12: +2
- **AND** heat 13+: +3

#### Scenario: Modifier summary
- **GIVEN** all individual modifiers calculated
- **WHEN** determining final to-hit
- **THEN** to-hit = base + range + attacker movement + TMM + heat + other
- **AND** to-hit capped at 12 (impossible if higher)

### Requirement: Attack Resolution

The system SHALL resolve attacks by comparing dice roll to to-hit number.

#### Scenario: Hit determination
- **GIVEN** to-hit number T and dice roll R (2d6)
- **WHEN** resolving attack
- **THEN** R >= T: hit
- **AND** R < T: miss

#### Scenario: Automatic miss
- **GIVEN** dice roll of 2 (snake eyes)
- **WHEN** resolving attack
- **THEN** attack SHALL always miss regardless of modifiers

#### Scenario: Automatic hit (optional)
- **GIVEN** dice roll of 12 (boxcars)
- **WHEN** resolving attack
- **THEN** attack MAY be treated as automatic hit per optional rules

### Requirement: Hit Location Determination

The system SHALL determine hit location based on attack arc.

#### Scenario: Front arc hit location
- **GIVEN** attack from front arc, roll R (2d6)
- **WHEN** determining hit location
- **THEN** 2: Center Torso (critical)
- **AND** 3: Right Arm
- **AND** 4: Right Arm
- **AND** 5: Right Leg
- **AND** 6: Right Torso
- **AND** 7: Center Torso
- **AND** 8: Left Torso
- **AND** 9: Left Leg
- **AND** 10: Left Arm
- **AND** 11: Left Arm
- **AND** 12: Head

#### Scenario: Side arc hit location
- **GIVEN** attack from side arc
- **WHEN** determining hit location
- **THEN** modified hit location table SHALL be used
- **AND** increased chance of side torso and arm hits

#### Scenario: Rear arc hit location
- **GIVEN** attack from rear arc
- **WHEN** determining hit location
- **THEN** rear armor values SHALL be targeted
- **AND** modified hit location table used

### Requirement: Damage Application

The system SHALL apply damage to armor, structure, and trigger criticals.

#### Scenario: Armor damage
- **GIVEN** attack hits location with armor A, damage D
- **WHEN** applying damage
- **THEN** if D <= A: reduce armor by D, no further damage
- **AND** if D > A: reduce armor to 0, excess damages structure

#### Scenario: Structure damage
- **GIVEN** location with depleted armor, structure S, damage D
- **WHEN** applying damage to structure
- **THEN** reduce structure by D
- **AND** if structure > 0: trigger potential critical hit
- **AND** if structure <= 0: location destroyed

#### Scenario: Damage transfer
- **GIVEN** arm or leg location destroyed with excess damage
- **WHEN** transferring damage
- **THEN** excess damage transfers to adjacent torso
- **AND** arm damage → side torso
- **AND** leg damage → side torso

#### Scenario: Critical hit trigger
- **GIVEN** structure takes damage
- **WHEN** checking for critical hit
- **THEN** roll 2d6: 8+ triggers critical hit roll
- **AND** critical hit damages equipment in location

### Requirement: Pilot Damage

The system SHALL track pilot wounds and consciousness.

#### Scenario: Pilot hit sources
- **GIVEN** combat event
- **WHEN** determining pilot damage
- **THEN** head hit: 1 wound
- **AND** ammo explosion: 2 wounds
- **AND** mech destruction: 1 wound (ejection)

#### Scenario: Consciousness check
- **GIVEN** pilot takes wound, total wounds W
- **WHEN** checking consciousness
- **THEN** roll 2d6, must exceed 3 + W
- **AND** failure: pilot unconscious, unit inactive

#### Scenario: Pilot death
- **GIVEN** pilot with 6+ wounds
- **WHEN** applying wound
- **THEN** pilot is killed
- **AND** unit is destroyed/uncontrolled
