# to-hit-resolution Specification

## Purpose

Defines the complete to-hit calculation system for BattleTech weapon attacks, including all 20+ modifier types (gunnery skill, range, movement, heat, terrain, damage, quirks, SPAs) and hit location determination for all firing arcs. This specification encodes TotalWarfare/TechManual to-hit rules and hit location tables as machine-readable requirements.

The to-hit system aggregates modifiers from multiple sources (base gunnery, environmental conditions, unit state, pilot abilities, unit quirks) into a final target number for 2d6 resolution. Hit location determination uses arc-specific tables to translate successful hits into specific mech locations.

**Cross-references**: quirk-combat-integration, spa-combat-integration, environmental-combat-modifiers, terrain-system, combat-resolution

---

## Requirements

### Requirement: Base Gunnery Skill Modifier

The system SHALL use the pilot's gunnery skill as the base to-hit target number.

#### Scenario: Gunnery 4 pilot base to-hit

- **WHEN** a pilot with gunnery skill 4 makes an attack
- **THEN** the base to-hit modifier SHALL be 4

#### Scenario: Gunnery 2 elite pilot base to-hit

- **WHEN** a pilot with gunnery skill 2 makes an attack
- **THEN** the base to-hit modifier SHALL be 2

---

### Requirement: Range Bracket Modifiers

The system SHALL apply range modifiers based on weapon range brackets.

#### Scenario: Short range no modifier

- **WHEN** attacking at short range (≤ weapon's short range)
- **THEN** the range modifier SHALL be +0

#### Scenario: Medium range modifier

- **WHEN** attacking at medium range (> short, ≤ medium)
- **THEN** the range modifier SHALL be +2

#### Scenario: Long range modifier

- **WHEN** attacking at long range (> medium, ≤ long)
- **THEN** the range modifier SHALL be +4

#### Scenario: Extreme range modifier

- **WHEN** attacking at extreme range (> long, ≤ extreme)
- **THEN** the range modifier SHALL be +6

#### Scenario: Out of range impossible

- **WHEN** attacking beyond extreme range
- **THEN** the attack SHALL be impossible (to-hit = Infinity)

---

### Requirement: Minimum Range Penalty

The system SHALL apply penalties for weapons with minimum range when firing inside that range.

#### Scenario: Inside minimum range penalty

- **WHEN** a weapon with minimum range 3 fires at range 1
- **THEN** the minimum range penalty SHALL be +2 (3 - 1 = 2)

#### Scenario: At minimum range no penalty

- **WHEN** a weapon with minimum range 3 fires at range 3
- **THEN** no minimum range penalty SHALL apply

#### Scenario: Beyond minimum range no penalty

- **WHEN** a weapon with minimum range 3 fires at range 5
- **THEN** no minimum range penalty SHALL apply

---

### Requirement: Attacker Movement Modifiers

The system SHALL apply to-hit penalties based on the attacker's movement type.

#### Scenario: Stationary attacker no penalty

- **WHEN** the attacker did not move (stationary)
- **THEN** the attacker movement modifier SHALL be +0

#### Scenario: Walking attacker penalty

- **WHEN** the attacker walked this turn
- **THEN** the attacker movement modifier SHALL be +1

#### Scenario: Running attacker penalty

- **WHEN** the attacker ran this turn
- **THEN** the attacker movement modifier SHALL be +2

#### Scenario: Jumping attacker penalty

- **WHEN** the attacker jumped this turn
- **THEN** the attacker movement modifier SHALL be +3

---

### Requirement: Target Movement Modifier (TMM)

The system SHALL calculate Target Movement Modifier based on hexes moved and movement type using canonical TMM brackets.

#### Scenario: Stationary target TMM 0

- **WHEN** the target did not move (0 hexes)
- **THEN** the TMM SHALL be 0

#### Scenario: Target moved 3 hexes TMM 1

- **WHEN** the target moved 3 hexes walking
- **THEN** the TMM SHALL be +1

#### Scenario: Target moved 5 hexes TMM 2

- **WHEN** the target moved 5 hexes walking
- **THEN** the TMM SHALL be +2

#### Scenario: Target moved 7 hexes TMM 3

- **WHEN** the target moved 7 hexes walking
- **THEN** the TMM SHALL be +3

#### Scenario: Target moved 10 hexes TMM 4

- **WHEN** the target moved 10 hexes walking
- **THEN** the TMM SHALL be +4

#### Scenario: Target moved 18 hexes TMM 5

- **WHEN** the target moved 18 hexes walking
- **THEN** the TMM SHALL be +5

#### Scenario: Target moved 25 hexes TMM 6

- **WHEN** the target moved 25 hexes walking
- **THEN** the TMM SHALL be +6

#### Scenario: Jump adds +1 to TMM

- **WHEN** the target jumped 5 hexes
- **THEN** the base TMM SHALL be 2 (for 5 hexes) + 1 (jump bonus) = +3

---

### Requirement: Heat Modifiers

The system SHALL apply to-hit penalties based on the attacker's current heat level using the HEAT_TO_HIT_TABLE.

#### Scenario: Heat 0-7 no penalty

- **WHEN** the attacker has heat level 5
- **THEN** the heat modifier SHALL be +0

#### Scenario: Heat 8-12 penalty +1

- **WHEN** the attacker has heat level 10
- **THEN** the heat modifier SHALL be +1

#### Scenario: Heat 13-16 penalty +2

- **WHEN** the attacker has heat level 15
- **THEN** the heat modifier SHALL be +2

#### Scenario: Heat 17-23 penalty +3

- **WHEN** the attacker has heat level 20
- **THEN** the heat modifier SHALL be +3

#### Scenario: Heat 24-25 penalty +4

- **WHEN** the attacker has heat level 24
- **THEN** the heat modifier SHALL be +4

#### Scenario: Heat 26+ penalty +5

- **WHEN** the attacker has heat level 28
- **THEN** the heat modifier SHALL be +5

---

### Requirement: Target Prone Modifier

The system SHALL apply modifiers when the target is prone based on range.

#### Scenario: Prone target adjacent easier to hit

- **WHEN** the target is prone and range is 1 hex
- **THEN** the prone modifier SHALL be -2 (easier to hit)

#### Scenario: Prone target at range harder to hit

- **WHEN** the target is prone and range is 5 hexes
- **THEN** the prone modifier SHALL be +1 (harder to hit)

---

### Requirement: Target Immobile Modifier

The system SHALL apply a bonus when the target is immobile.

#### Scenario: Immobile target easier to hit

- **WHEN** the target is immobile (shutdown, unconscious pilot)
- **THEN** the immobile modifier SHALL be -4

---

### Requirement: Partial Cover Modifier

The system SHALL apply a penalty when the target is in partial cover.

#### Scenario: Partial cover penalty

- **WHEN** the target is in partial cover
- **THEN** the partial cover modifier SHALL be +1

---

### Requirement: Terrain Modifiers

The system SHALL calculate to-hit modifiers from terrain features (intervening and target-in-terrain).

#### Scenario: Intervening light woods

- **WHEN** the line of fire passes through 1 hex of light woods
- **THEN** the terrain modifier SHALL be +1

#### Scenario: Intervening heavy woods

- **WHEN** the line of fire passes through 1 hex of heavy woods
- **THEN** the terrain modifier SHALL be +2

#### Scenario: Target in light woods

- **WHEN** the target occupies a hex with light woods
- **THEN** the terrain modifier SHALL be +1

#### Scenario: Target in heavy woods

- **WHEN** the target occupies a hex with heavy woods
- **THEN** the terrain modifier SHALL be +2

#### Scenario: Multiple intervening hexes cumulative

- **WHEN** the line of fire passes through 2 hexes of light woods
- **THEN** the terrain modifier SHALL be +2 (1 + 1)

---

### Requirement: Pilot Wound Modifier

The system SHALL apply +1 to-hit per pilot wound.

#### Scenario: 1 wound penalty

- **WHEN** the attacker's pilot has 1 wound
- **THEN** the pilot wound modifier SHALL be +1

#### Scenario: 3 wounds penalty

- **WHEN** the attacker's pilot has 3 wounds
- **THEN** the pilot wound modifier SHALL be +3

#### Scenario: Pain Resistance SPA reduces wounds

- **WHEN** the attacker's pilot has 2 wounds and Pain Resistance SPA
- **THEN** the effective wounds SHALL be 1 (2 - 1)
- **AND** the pilot wound modifier SHALL be +1

---

### Requirement: Secondary Target Modifier

The system SHALL apply penalties for attacking secondary targets.

#### Scenario: Secondary target front arc penalty

- **WHEN** attacking a secondary target in the front arc
- **THEN** the secondary target modifier SHALL be +1

#### Scenario: Secondary target other arc penalty

- **WHEN** attacking a secondary target outside the front arc
- **THEN** the secondary target modifier SHALL be +2

---

### Requirement: Targeting Computer Modifier

The system SHALL apply a bonus when the attacker has a targeting computer.

#### Scenario: Targeting computer bonus

- **WHEN** the attacker has a targeting computer
- **THEN** the targeting computer modifier SHALL be -1

---

### Requirement: Sensor Damage Modifier

The system SHALL apply +1 to-hit per sensor hit.

#### Scenario: 1 sensor hit penalty

- **WHEN** the attacker has 1 sensor hit
- **THEN** the sensor damage modifier SHALL be +1

#### Scenario: 2 sensor hits penalty

- **WHEN** the attacker has 2 sensor hits
- **THEN** the sensor damage modifier SHALL be +2

---

### Requirement: Actuator Damage Modifier

The system SHALL apply penalties for destroyed actuators.

#### Scenario: Shoulder destroyed penalty

- **WHEN** the attacker's shoulder actuator is destroyed
- **THEN** the actuator damage modifier SHALL be +4

#### Scenario: Upper arm destroyed penalty

- **WHEN** the attacker's upper arm actuator is destroyed
- **THEN** the actuator damage modifier SHALL be +1

#### Scenario: Lower arm destroyed penalty

- **WHEN** the attacker's lower arm actuator is destroyed
- **THEN** the actuator damage modifier SHALL be +1

#### Scenario: All arm actuators destroyed cumulative

- **WHEN** the attacker's shoulder, upper arm, and lower arm actuators are all destroyed
- **THEN** the actuator damage modifier SHALL be +6 (4 + 1 + 1)

---

### Requirement: Attacker Prone Modifier

The system SHALL apply a penalty when the attacker is prone.

#### Scenario: Attacker prone penalty

- **WHEN** the attacker is prone
- **THEN** the attacker prone modifier SHALL be +2

---

### Requirement: Indirect Fire Modifier

The system SHALL apply penalties for indirect fire attacks.

#### Scenario: Indirect fire base penalty

- **WHEN** making an indirect fire attack with stationary spotter
- **THEN** the indirect fire modifier SHALL be +1

#### Scenario: Indirect fire with spotter walked

- **WHEN** making an indirect fire attack and the spotter walked
- **THEN** the indirect fire modifier SHALL be +2 (+1 base + 1 spotter walked)

---

### Requirement: Called Shot Modifier

The system SHALL apply a penalty for called shots.

#### Scenario: Called shot penalty

- **WHEN** making a called shot
- **THEN** the called shot modifier SHALL be +3

#### Scenario: Sharpshooter SPA reduces called shot penalty

- **WHEN** making a called shot with Sharpshooter SPA
- **THEN** the called shot modifier SHALL be +2 (reduced from +3)

---

### Requirement: Called Shot via Teammate Spotter (OPTIONAL)

When a friendly teammate with line of sight to the target designates a called shot location, the shooter MAY fire a called shot at that location with NO called shot to-hit penalty. The standard called shot penalty of +3 is waived entirely when a valid teammate spotter designates the location.

> **Priority**: OPTIONAL / MEDIUM
>
> **Canonical Status**: No confirmed canonical BattleTech rule source (TotalWarfare, TechManual, TacOps) defines this mechanic. The only spotter mechanic in BattleTech applies to indirect fire (TW p. 111), not to called shots. MegaMek does not implement this mechanic either. This is implemented as an optional house rule for gameplay enrichment.
>
> **Prerequisites**:
>
> - The spotter MUST be a friendly unit on the same team as the shooter
> - The spotter MUST have line of sight (LOS) to the target
> - The shooter MUST have a valid attack against the target (LOS or indirect fire)
> - The spotter and shooter MUST be different units
> - The `teammateCalledShot` flag on `IAttackerState` activates this mechanic

#### Scenario: Teammate designates called shot location — no penalty

- **GIVEN** a friendly teammate has LOS to the target
- **AND** the teammate designates a called shot location on the target
- **WHEN** the shooter fires a called shot at the designated location
- **THEN** the called shot to-hit penalty SHALL be +0 (waived entirely)
- **AND** the hit location SHALL be the designated location (per normal called shot resolution)

#### Scenario: No teammate spotter — standard called shot penalty

- **GIVEN** no friendly teammate has designated a called shot location
- **WHEN** the shooter fires a called shot
- **THEN** the standard called shot penalty of +3 SHALL apply

#### Scenario: Sharpshooter SPA with teammate spotter

- **GIVEN** a friendly teammate has designated a called shot location
- **AND** the shooter has the Sharpshooter SPA
- **WHEN** the shooter fires a called shot at the designated location
- **THEN** the called shot penalty SHALL be +0 (teammate spotter already waives the penalty)
- **AND** the Sharpshooter SPA SHALL have no additional effect (penalty cannot go below +0)

#### Scenario: Sharpshooter SPA without teammate spotter

- **GIVEN** no friendly teammate has designated a called shot location
- **AND** the shooter has the Sharpshooter SPA
- **WHEN** the shooter fires a called shot
- **THEN** the called shot penalty SHALL be +2 (standard +3, reduced by -1 from Sharpshooter)

#### Scenario: Indirect fire spotter does not grant called shot benefit

- **WHEN** a spotter designates a target for indirect fire
- **THEN** the spotter designation SHALL NOT automatically grant called shot location targeting
- **AND** called shot via teammate spotter requires explicit `teammateCalledShot` activation

---

### Requirement: Quirk Modifiers Integration

The system SHALL integrate quirk-based to-hit modifiers from quirk-combat-integration.

#### Scenario: Improved Targeting Short quirk

- **WHEN** the attacker has Improved Targeting (Short) and attacks at short range
- **THEN** a -1 quirk modifier SHALL be applied

#### Scenario: Poor Targeting Medium quirk

- **WHEN** the attacker has Poor Targeting (Medium) and attacks at medium range
- **THEN** a +1 quirk modifier SHALL be applied

#### Scenario: Distracting target quirk

- **WHEN** the target has the Distracting quirk
- **THEN** a +1 quirk modifier SHALL be applied to attacks against it

#### Scenario: Sensor Ghosts attacker quirk

- **WHEN** the attacker has the Sensor Ghosts quirk
- **THEN** a +1 quirk modifier SHALL be applied to its own attacks

#### Scenario: Multi-Trac eliminates front arc secondary penalty

- **WHEN** the attacker has Multi-Trac and fires at a secondary target in the front arc
- **THEN** the secondary target penalty SHALL be 0 (quirk eliminates +1 penalty)

---

### Requirement: SPA Modifiers Integration

The system SHALL integrate SPA-based to-hit modifiers from spa-combat-integration.

#### Scenario: Weapon Specialist SPA

- **WHEN** the attacker has Weapon Specialist (Medium Laser) and fires a Medium Laser
- **THEN** a -2 SPA modifier SHALL be applied

#### Scenario: Range Master SPA zeroes range modifier

- **WHEN** the attacker has Range Master (Medium) and fires at medium range
- **THEN** the range modifier SHALL be 0 (instead of +2)

#### Scenario: Sniper SPA halves range modifiers

- **WHEN** the attacker has Sniper SPA and fires at long range (normally +4)
- **THEN** the range modifier SHALL be +2 (halved)

#### Scenario: Multi-Tasker SPA reduces secondary penalty

- **WHEN** the attacker has Multi-Tasker SPA and fires at a secondary target in front arc
- **THEN** the secondary target penalty SHALL be 0 (reduced from +1)

---

### Requirement: Environmental Modifiers Integration

The system SHALL integrate environmental modifiers from environmental-combat-modifiers.

#### Scenario: Night combat modifier

- **WHEN** combat takes place during nighttime conditions
- **THEN** a +2 environmental modifier SHALL be applied

#### Scenario: Light rain modifier

- **WHEN** combat takes place during light rain
- **THEN** a +1 environmental modifier SHALL be applied

#### Scenario: Heavy fog modifier

- **WHEN** combat takes place in heavy fog
- **THEN** a +2 environmental modifier SHALL be applied

---

### Requirement: Modifier Aggregation

The system SHALL aggregate all applicable modifiers into a final to-hit target number.

#### Scenario: Simple attack aggregation

- **WHEN** a gunnery 4 pilot fires at medium range while walking
- **THEN** the final to-hit SHALL be 4 (gunnery) + 2 (medium range) + 1 (walking) = 7

#### Scenario: Complex attack aggregation

- **WHEN** a gunnery 4 pilot with 1 wound fires at long range while running at heat 15, targeting a unit that moved 5 hexes in light woods
- **THEN** the final to-hit SHALL be 4 (gunnery) + 4 (long range) + 2 (running) + 2 (heat 15) + 1 (wound) + 2 (TMM for 5 hexes) + 1 (light woods) = 16

#### Scenario: To-hit capped at 13 (impossible)

- **WHEN** the aggregated modifiers total 15
- **THEN** the final to-hit SHALL be capped at 13
- **AND** the attack SHALL be marked as impossible

---

### Requirement: Probability Calculation

The system SHALL calculate hit probability using the 2d6 PROBABILITY_TABLE.

#### Scenario: To-hit 2 probability 100%

- **WHEN** the final to-hit is 2
- **THEN** the hit probability SHALL be 1.0 (100%)

#### Scenario: To-hit 7 probability 58.3%

- **WHEN** the final to-hit is 7
- **THEN** the hit probability SHALL be 21/36 (58.3%)

#### Scenario: To-hit 10 probability 16.7%

- **WHEN** the final to-hit is 10
- **THEN** the hit probability SHALL be 6/36 (16.7%)

#### Scenario: To-hit 12 probability 2.8%

- **WHEN** the final to-hit is 12
- **THEN** the hit probability SHALL be 1/36 (2.8%)

#### Scenario: To-hit 13+ probability 0%

- **WHEN** the final to-hit is 13 or higher
- **THEN** the hit probability SHALL be 0 (impossible)

---

### Requirement: Front Arc Hit Location Table

The system SHALL use the front arc hit location table for attacks from the front.

#### Scenario: Front arc roll 2 center torso critical

- **WHEN** a front arc attack rolls 2 on 2d6
- **THEN** the hit location SHALL be center_torso
- **AND** the hit SHALL be marked as critical

#### Scenario: Front arc roll 3-4 right arm

- **WHEN** a front arc attack rolls 3 or 4 on 2d6
- **THEN** the hit location SHALL be right_arm

#### Scenario: Front arc roll 5 right leg

- **WHEN** a front arc attack rolls 5 on 2d6
- **THEN** the hit location SHALL be right_leg

#### Scenario: Front arc roll 6 right torso

- **WHEN** a front arc attack rolls 6 on 2d6
- **THEN** the hit location SHALL be right_torso

#### Scenario: Front arc roll 7 center torso

- **WHEN** a front arc attack rolls 7 on 2d6
- **THEN** the hit location SHALL be center_torso

#### Scenario: Front arc roll 8 left torso

- **WHEN** a front arc attack rolls 8 on 2d6
- **THEN** the hit location SHALL be left_torso

#### Scenario: Front arc roll 9 left leg

- **WHEN** a front arc attack rolls 9 on 2d6
- **THEN** the hit location SHALL be left_leg

#### Scenario: Front arc roll 10-11 left arm

- **WHEN** a front arc attack rolls 10 or 11 on 2d6
- **THEN** the hit location SHALL be left_arm

#### Scenario: Front arc roll 12 head

- **WHEN** a front arc attack rolls 12 on 2d6
- **THEN** the hit location SHALL be head
- **AND** the hit SHALL be marked as critical

---

### Requirement: Left Side Arc Hit Location Table

The system SHALL use the left side arc hit location table for attacks from the left.

#### Scenario: Left arc roll 2 left torso critical

- **WHEN** a left arc attack rolls 2 on 2d6
- **THEN** the hit location SHALL be left_torso
- **AND** the hit SHALL be marked as critical

#### Scenario: Left arc roll 3 left leg

- **WHEN** a left arc attack rolls 3 on 2d6
- **THEN** the hit location SHALL be left_leg

#### Scenario: Left arc roll 4-5 left arm

- **WHEN** a left arc attack rolls 4 or 5 on 2d6
- **THEN** the hit location SHALL be left_arm

#### Scenario: Left arc roll 6 left leg

- **WHEN** a left arc attack rolls 6 on 2d6
- **THEN** the hit location SHALL be left_leg

#### Scenario: Left arc roll 7 left torso

- **WHEN** a left arc attack rolls 7 on 2d6
- **THEN** the hit location SHALL be left_torso

#### Scenario: Left arc roll 8 center torso

- **WHEN** a left arc attack rolls 8 on 2d6
- **THEN** the hit location SHALL be center_torso

#### Scenario: Left arc roll 9 right torso

- **WHEN** a left arc attack rolls 9 on 2d6
- **THEN** the hit location SHALL be right_torso

#### Scenario: Left arc roll 10 right arm

- **WHEN** a left arc attack rolls 10 on 2d6
- **THEN** the hit location SHALL be right_arm

#### Scenario: Left arc roll 11 right leg

- **WHEN** a left arc attack rolls 11 on 2d6
- **THEN** the hit location SHALL be right_leg

#### Scenario: Left arc roll 12 head

- **WHEN** a left arc attack rolls 12 on 2d6
- **THEN** the hit location SHALL be head
- **AND** the hit SHALL be marked as critical

---

### Requirement: Right Side Arc Hit Location Table

The system SHALL use the right side arc hit location table for attacks from the right.

#### Scenario: Right arc roll 2 right torso critical

- **WHEN** a right arc attack rolls 2 on 2d6
- **THEN** the hit location SHALL be right_torso
- **AND** the hit SHALL be marked as critical

#### Scenario: Right arc roll 3 right leg

- **WHEN** a right arc attack rolls 3 on 2d6
- **THEN** the hit location SHALL be right_leg

#### Scenario: Right arc roll 4-5 right arm

- **WHEN** a right arc attack rolls 4 or 5 on 2d6
- **THEN** the hit location SHALL be right_arm

#### Scenario: Right arc roll 6 right leg

- **WHEN** a right arc attack rolls 6 on 2d6
- **THEN** the hit location SHALL be right_leg

#### Scenario: Right arc roll 7 right torso

- **WHEN** a right arc attack rolls 7 on 2d6
- **THEN** the hit location SHALL be right_torso

#### Scenario: Right arc roll 8 center torso

- **WHEN** a right arc attack rolls 8 on 2d6
- **THEN** the hit location SHALL be center_torso

#### Scenario: Right arc roll 9 left torso

- **WHEN** a right arc attack rolls 9 on 2d6
- **THEN** the hit location SHALL be left_torso

#### Scenario: Right arc roll 10 left arm

- **WHEN** a right arc attack rolls 10 on 2d6
- **THEN** the hit location SHALL be left_arm

#### Scenario: Right arc roll 11 left leg

- **WHEN** a right arc attack rolls 11 on 2d6
- **THEN** the hit location SHALL be left_leg

#### Scenario: Right arc roll 12 head

- **WHEN** a right arc attack rolls 12 on 2d6
- **THEN** the hit location SHALL be head
- **AND** the hit SHALL be marked as critical

---

### Requirement: Rear Arc Hit Location Table

The system SHALL use the rear arc hit location table for attacks from the rear, using rear armor values.

#### Scenario: Rear arc roll 2 center torso rear critical

- **WHEN** a rear arc attack rolls 2 on 2d6
- **THEN** the hit location SHALL be center_torso_rear
- **AND** the hit SHALL be marked as critical

#### Scenario: Rear arc roll 3-4 right arm

- **WHEN** a rear arc attack rolls 3 or 4 on 2d6
- **THEN** the hit location SHALL be right_arm

#### Scenario: Rear arc roll 5 right leg

- **WHEN** a rear arc attack rolls 5 on 2d6
- **THEN** the hit location SHALL be right_leg

#### Scenario: Rear arc roll 6 right torso rear

- **WHEN** a rear arc attack rolls 6 on 2d6
- **THEN** the hit location SHALL be right_torso_rear

#### Scenario: Rear arc roll 7 center torso rear

- **WHEN** a rear arc attack rolls 7 on 2d6
- **THEN** the hit location SHALL be center_torso_rear

#### Scenario: Rear arc roll 8 left torso rear

- **WHEN** a rear arc attack rolls 8 on 2d6
- **THEN** the hit location SHALL be left_torso_rear

#### Scenario: Rear arc roll 9 left leg

- **WHEN** a rear arc attack rolls 9 on 2d6
- **THEN** the hit location SHALL be left_leg

#### Scenario: Rear arc roll 10-11 left arm

- **WHEN** a rear arc attack rolls 10 or 11 on 2d6
- **THEN** the hit location SHALL be left_arm

#### Scenario: Rear arc roll 12 head

- **WHEN** a rear arc attack rolls 12 on 2d6
- **THEN** the hit location SHALL be head
- **AND** the hit SHALL be marked as critical

---

### Requirement: Punch Hit Location Table

The system SHALL use the punch hit location table (1d6) for punch attacks.

#### Scenario: Punch roll 1 left arm

- **WHEN** a punch attack rolls 1 on 1d6
- **THEN** the hit location SHALL be left_arm

#### Scenario: Punch roll 2 left torso

- **WHEN** a punch attack rolls 2 on 1d6
- **THEN** the hit location SHALL be left_torso

#### Scenario: Punch roll 3 center torso

- **WHEN** a punch attack rolls 3 on 1d6
- **THEN** the hit location SHALL be center_torso

#### Scenario: Punch roll 4 right torso

- **WHEN** a punch attack rolls 4 on 1d6
- **THEN** the hit location SHALL be right_torso

#### Scenario: Punch roll 5 right arm

- **WHEN** a punch attack rolls 5 on 1d6
- **THEN** the hit location SHALL be right_arm

#### Scenario: Punch roll 6 head

- **WHEN** a punch attack rolls 6 on 1d6
- **THEN** the hit location SHALL be head

---

### Requirement: Kick Hit Location Table

The system SHALL use the kick hit location table (1d6) for kick attacks.

#### Scenario: Kick roll 1-3 right leg

- **WHEN** a kick attack rolls 1, 2, or 3 on 1d6
- **THEN** the hit location SHALL be right_leg

#### Scenario: Kick roll 4-6 left leg

- **WHEN** a kick attack rolls 4, 5, or 6 on 1d6
- **THEN** the hit location SHALL be left_leg

---

### Requirement: Cluster Damage Distribution

The system SHALL distribute cluster weapon hits across multiple locations.

#### Scenario: LRM-20 with 10 hits distributes damage

- **WHEN** an LRM-20 scores 10 hits (each dealing 1 damage)
- **THEN** 10 separate hit location rolls SHALL be made
- **AND** each hit SHALL apply 1 damage to its rolled location

#### Scenario: Cluster hits grouped by location

- **WHEN** cluster hits are distributed and 3 hits land on right torso, 2 on center torso, 5 on left leg
- **THEN** the grouped damage SHALL be: right_torso = 3, center_torso = 2, left_leg = 5

---

### Requirement: Critical Hit Determination

The system SHALL mark hits as critical based on location and roll.

#### Scenario: Roll of 2 always critical

- **WHEN** any hit location roll is 2
- **THEN** the hit SHALL be marked as critical

#### Scenario: Head hit always critical

- **WHEN** the hit location is head
- **THEN** the hit SHALL be marked as critical

#### Scenario: Center torso hit always critical

- **WHEN** the hit location is center_torso or center_torso_rear
- **THEN** the hit SHALL be marked as critical

---

### Requirement: PROBABILITY_TABLE Documentation

The system SHALL document the complete 2d6 probability table for reference.

#### Scenario: PROBABILITY_TABLE completeness

- **WHEN** accessing the PROBABILITY_TABLE
- **THEN** it SHALL contain entries for target numbers 2 through 13
- **AND** probabilities SHALL be: 2 = 36/36, 3 = 35/36, 4 = 33/36, 5 = 30/36, 6 = 26/36, 7 = 21/36, 8 = 15/36, 9 = 10/36, 10 = 6/36, 11 = 3/36, 12 = 1/36, 13 = 0/36

---

### Requirement: RANGE_MODIFIERS Table Documentation

The system SHALL document the complete range modifier table.

#### Scenario: RANGE_MODIFIERS table completeness

- **WHEN** accessing the RANGE_MODIFIERS table
- **THEN** it SHALL contain: Short = 0, Medium = 2, Long = 4, Extreme = 6, OutOfRange = Infinity

---

### Requirement: TMM Bracket Table Documentation

The system SHALL document the canonical TMM bracket table.

#### Scenario: TMM bracket table completeness

- **WHEN** accessing the TMM bracket table
- **THEN** it SHALL contain: 0-2 hexes = 0, 3-4 hexes = 1, 5-6 hexes = 2, 7-9 hexes = 3, 10-17 hexes = 4, 18-24 hexes = 5, 25+ hexes = 6

---

## Cross-References

### Depends On

- **quirk-combat-integration**: Quirk-based to-hit modifiers (Improved/Poor Targeting, Distracting, Sensor Ghosts, Multi-Trac, weapon quirks)
- **spa-combat-integration**: SPA-based to-hit modifiers (Weapon Specialist, Range Master, Sniper, Multi-Tasker, Pain Resistance)
- **environmental-combat-modifiers**: Environmental to-hit modifiers (light, precipitation, fog, wind)
- **terrain-system**: Terrain-based to-hit modifiers (intervening and target-in-terrain)
- **combat-resolution**: Attack resolution pipeline integration

### Used By

- **combat-resolution**: Uses to-hit calculation and hit location determination for weapon attack resolution
- **physical-attack-system**: Uses punch/kick hit location tables for physical attacks
- **damage-system**: Uses hit location results for damage application

---

## Implementation Notes

### Modifier Aggregation Order

1. Base gunnery skill
2. Range bracket modifier
3. Minimum range penalty (if applicable)
4. Attacker movement modifier
5. Target movement modifier (TMM)
6. Heat modifier
7. Target state modifiers (prone, immobile, partial cover)
8. Terrain modifiers (intervening + target-in-terrain)
9. Damage modifiers (pilot wounds, sensor hits, actuator damage)
10. Equipment modifiers (targeting computer)
11. Attacker state modifiers (prone, secondary target, indirect fire, called shot)
12. Quirk modifiers (from quirk-combat-integration)
13. SPA modifiers (from spa-combat-integration)
14. Environmental modifiers (from environmental-combat-modifiers)

### Performance Considerations

- Modifier calculation is pure functional (no side effects)
- All modifiers return `IToHitModifierDetail | null` for optional modifiers
- Aggregation uses `reduce()` for efficient summation
- Probability lookup is O(1) via PROBABILITY_TABLE

### Edge Cases

- To-hit capped at 13 (impossible) even if modifiers exceed 13
- Minimum range penalty can stack with other modifiers
- TMM uses canonical bracket table (not simple division)
- Jump movement adds +1 to base TMM from hexes moved
- Quirk and SPA modifiers can cancel each other (e.g., Multi-Trac + Multi-Tasker both reduce secondary penalty)

---

## Examples

### Example 1: Simple Attack

```typescript
const attacker: IAttackerState = {
  gunnery: 4,
  movementType: MovementType.Walk,
  heat: 0,
  // ... other fields
};

const target: ITargetState = {
  movementType: MovementType.Walk,
  hexesMoved: 5,
  // ... other fields
};

const calc = calculateToHit(attacker, target, RangeBracket.Medium, 8);
// Result: 4 (gunnery) + 2 (medium) + 1 (walk) + 2 (TMM 5 hexes) = 9
// Probability: 10/36 = 27.8%
```

### Example 2: Complex Attack with Quirks and SPAs

```typescript
const attacker: IAttackerState = {
  gunnery: 3,
  movementType: MovementType.Run,
  heat: 15,
  pilotWounds: 2,
  sensorHits: 1,
  unitQuirks: ['improved_targeting_long'],
  abilities: ['weapon_specialist_medium_laser', 'pain_resistance'],
  // ... other fields
};

const target: ITargetState = {
  movementType: MovementType.Jump,
  hexesMoved: 6,
  unitQuirks: ['distracting'],
  // ... other fields
};

const calc = calculateToHit(attacker, target, RangeBracket.Long, 12);
// Result: 3 (gunnery) + 4 (long) + 2 (run) + 2 (heat 15) + 1 (wound after Pain Resistance) + 1 (sensor) + 3 (TMM 6 hexes jump) + 1 (Distracting) - 1 (Improved Targeting Long) - 2 (Weapon Specialist) = 14 → capped at 13
// Probability: 0% (impossible)
```

### Example 3: Hit Location Determination

```typescript
const hitResult = determineHitLocation(FiringArc.Front);
// Roll: 7 → center_torso
// isCritical: true (center torso is always critical)

const rearHitResult = determineHitLocation(FiringArc.Rear);
// Roll: 6 → right_torso_rear
// isCritical: false (not a 2 or head/CT)
```

### Example 4: Cluster Damage Distribution

```typescript
const clusterHits = distributeClusterHits(FiringArc.Front, 10, 1);
// 10 separate 2d6 rolls for hit location
// Example result: [
//   { location: 'right_torso', damage: 1, roll: { total: 6 } },
//   { location: 'center_torso', damage: 1, roll: { total: 7 } },
//   { location: 'left_leg', damage: 1, roll: { total: 9 } },
//   // ... 7 more hits
// ]

const grouped = groupHitsByLocation(clusterHits);
// Map: { right_torso: 3, center_torso: 2, left_leg: 5 }
```

---

## References

- **TotalWarfare**: To-hit modifier tables (p. 43-45), hit location tables (p. 46)
- **TechManual**: Advanced to-hit modifiers, terrain effects
- **Implementation**: `src/utils/gameplay/toHit.ts` (749 lines), `src/utils/gameplay/hitLocation.ts` (364 lines)
- **Related Specs**: quirk-combat-integration, spa-combat-integration, environmental-combat-modifiers, terrain-system, combat-resolution
