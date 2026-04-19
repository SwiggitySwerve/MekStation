# spa-combat-integration Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Gunnery SPA — Weapon Specialist

The Weapon Specialist SPA SHALL grant a -2 to-hit modifier (not -1) when firing the designated weapon type. This corrects the previous value which halved the intended benefit.

#### Scenario: Weapon Specialist with designated weapon

- **GIVEN** a pilot with Weapon Specialist (Medium Laser)
- **WHEN** the pilot fires a Medium Laser
- **THEN** the attack SHALL receive a -2 to-hit modifier

#### Scenario: Weapon Specialist with non-designated weapon

- **GIVEN** a pilot with Weapon Specialist (Medium Laser)
- **WHEN** the pilot fires an AC/10
- **THEN** no Weapon Specialist modifier SHALL apply

### Requirement: Gunnery SPA — Gunnery Specialist

The Gunnery Specialist SPA SHALL grant -1 to-hit for attacks with the
weapon category stored as the pilot's Gunnery Specialist designation
and +1 for all other categories. The combat layer SHALL obtain the
designated category via `getPilotDesignation(pilot,
"gunnery_specialist")`.

#### Scenario: Gunnery Specialist with stored Energy designation

- **GIVEN** a pilot owns `gunnery_specialist` with designation
  `{ type: "weapon_category", value: "energy" }`
- **WHEN** the pilot fires an energy weapon
- **THEN** the attack SHALL receive -1 to-hit

#### Scenario: Gunnery Specialist with stored Energy designation on ballistic weapon

- **GIVEN** a pilot owns `gunnery_specialist` with designation
  `{ type: "weapon_category", value: "energy" }`
- **WHEN** the pilot fires a ballistic weapon
- **THEN** the attack SHALL receive +1 to-hit

### Requirement: Gunnery SPA — Blood Stalker

The Blood Stalker SPA SHALL grant -1 to-hit against the target stored as
the pilot's Blood Stalker designation and +2 against all other targets.
The combat layer SHALL obtain the designated target id via
`getPilotDesignation(pilot, "blood_stalker")`.

#### Scenario: Blood Stalker against stored target

- **GIVEN** a pilot owns `blood_stalker` with designation
  `{ type: "target", value: "unit-abc-123" }`
- **WHEN** the pilot attacks unit-abc-123
- **THEN** the attack SHALL receive -1 to-hit

#### Scenario: Blood Stalker against a different target

- **GIVEN** a pilot owns `blood_stalker` with designation
  `{ type: "target", value: "unit-abc-123" }`
- **WHEN** the pilot attacks a unit other than unit-abc-123
- **THEN** the attack SHALL receive +2 to-hit

### Requirement: Gunnery SPA — Range Master

The Range Master SPA SHALL zero the range modifier for the range bracket
stored as the pilot's Range Master designation. The combat layer SHALL
obtain the designated bracket via `getPilotDesignation(pilot,
"range_master")`.

#### Scenario: Range Master with stored medium designation

- **GIVEN** a pilot owns `range_master` with designation
  `{ type: "range_bracket", value: "medium" }`
- **WHEN** the pilot fires at medium range
- **THEN** the range to-hit modifier SHALL be 0 (instead of +2)

#### Scenario: Range Master with stored medium designation at long range

- **GIVEN** a pilot owns `range_master` with designation
  `{ type: "range_bracket", value: "medium" }`
- **WHEN** the pilot fires at long range
- **THEN** the normal long range modifier SHALL apply

### Requirement: Gunnery SPA — Sniper

The Sniper SPA SHALL halve (floor-divide) every range modifier — short, medium, long, extreme — not merely zero the medium-range penalty.

#### Scenario: Sniper at short range

- **GIVEN** a pilot with Sniper firing at short range (base +0)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +0 (floor(0 / 2))

#### Scenario: Sniper at medium range

- **GIVEN** a pilot with Sniper firing at medium range (base +2)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +1 (floor(2 / 2))

#### Scenario: Sniper at long range

- **GIVEN** a pilot with Sniper firing at long range (base +4)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +2 (floor(4 / 2))

#### Scenario: Sniper at extreme range

- **GIVEN** a pilot with Sniper firing at extreme range (base +6)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +3 (floor(6 / 2))

### Requirement: Gunnery SPA — Multi-Tasker

The Multi-Tasker SPA SHALL reduce secondary target penalties by 1.

#### Scenario: Multi-Tasker reduces secondary penalty

- **WHEN** a pilot with Multi-Tasker fires at a secondary target in the front arc
- **THEN** the secondary target penalty SHALL be 0 (instead of +1)

#### Scenario: Multi-Tasker with rear arc secondary

- **WHEN** a pilot with Multi-Tasker fires at a secondary target outside the front arc
- **THEN** the secondary target penalty SHALL be +1 (instead of +2)

### Requirement: Gunnery SPA — Cluster Hitter

The Cluster Hitter SPA SHALL add +1 to the cluster hit table column shift.

#### Scenario: Cluster Hitter bonus

- **WHEN** a pilot with Cluster Hitter fires a cluster weapon
- **THEN** the cluster hit roll SHALL receive a +1 column shift (more hits)

### Requirement: Gunnery SPA — Marksman

The Marksman SPA SHALL grant -1 to-hit for aimed/called shots.

#### Scenario: Marksman aimed shot bonus

- **WHEN** a pilot with Marksman makes an aimed shot
- **THEN** the attack SHALL receive a -1 to-hit modifier

### Requirement: Gunnery SPA — Sandblaster

The Sandblaster SPA SHALL grant +1 cluster hits with ultra/rotary autocannons.

#### Scenario: Sandblaster ultra AC bonus

- **WHEN** a pilot with Sandblaster fires an ultra or rotary autocannon
- **THEN** the cluster hit roll SHALL receive a +1 bonus

### Requirement: Gunnery SPA — Oblique Attacker

The Oblique Attacker SPA SHALL reduce indirect fire penalty by 1.

#### Scenario: Oblique Attacker indirect fire bonus

- **WHEN** a pilot with Oblique Attacker makes an indirect fire attack
- **THEN** the indirect fire penalty SHALL be reduced by 1

### Requirement: Gunnery SPA — Sharpshooter

The Sharpshooter SPA SHALL reduce called shot modifier by 1 (from +3 to +2).

#### Scenario: Sharpshooter called shot bonus

- **WHEN** a pilot with Sharpshooter makes a called shot
- **THEN** the called shot modifier SHALL be +2 (instead of +3)

### Requirement: Piloting SPA — Jumping Jack

The Jumping Jack SPA SHALL modify the attacker's to-hit when the attacker jumped this turn, NOT the target's piloting roll.

When an attacker with Jumping Jack jumped, the jump-movement to-hit penalty (normally +3) SHALL be reduced by 1 (net +2). The SPA SHALL NOT affect any piloting-skill-roll calculation.

#### Scenario: Attacker with Jumping Jack jumps and fires

- **GIVEN** an attacker with the Jumping Jack SPA who jumped this turn
- **WHEN** the to-hit modifier is computed
- **THEN** the jumping-attacker penalty SHALL be +2 (reduced from +3)

#### Scenario: Attacker with Jumping Jack did not jump

- **GIVEN** an attacker with the Jumping Jack SPA who walked this turn
- **WHEN** the to-hit modifier is computed
- **THEN** no Jumping Jack modifier SHALL apply
- **AND** the standard walking penalty (+1) SHALL apply

#### Scenario: Jumping Jack no longer affects PSRs

- **GIVEN** an attacker with the Jumping Jack SPA who triggers a piloting-skill roll
- **WHEN** the PSR modifiers are aggregated
- **THEN** Jumping Jack SHALL NOT contribute any modifier to the PSR

### Requirement: Piloting SPA — Dodge Maneuver

The Dodge Maneuver SPA SHALL grant +2 to-hit for enemies when the pilot declares a dodge action.

#### Scenario: Dodge action grants defensive bonus

- **WHEN** a pilot with Dodge Maneuver declares a dodge action
- **THEN** all attacks against the dodging unit SHALL receive a +2 to-hit modifier
- **AND** the pilot SHALL forfeit their attack for that turn

### Requirement: Piloting SPA — Melee Specialist

The Melee Specialist SPA SHALL grant -1 to-hit for physical attacks.

#### Scenario: Melee Specialist punch bonus

- **WHEN** a pilot with Melee Specialist makes a punch attack
- **THEN** the attack SHALL receive a -1 to-hit modifier

#### Scenario: Melee Specialist kick bonus

- **WHEN** a pilot with Melee Specialist makes a kick attack
- **THEN** the attack SHALL receive a -1 to-hit modifier

### Requirement: Piloting SPA — Melee Master

The Melee Master SPA SHALL improve physical attack damage.

#### Scenario: Melee Master damage bonus

- **WHEN** a pilot with Melee Master lands a physical attack
- **THEN** the physical attack damage SHALL be increased by 1 point

### Requirement: Piloting SPA — Maneuvering Ace

The Maneuvering Ace SPA SHALL grant -1 PSR for terrain and skidding.

#### Scenario: Maneuvering Ace terrain bonus

- **WHEN** a pilot with Maneuvering Ace makes a PSR for terrain
- **THEN** the PSR SHALL receive a -1 modifier

#### Scenario: Maneuvering Ace skidding bonus

- **WHEN** a pilot with Maneuvering Ace makes a PSR for skidding
- **THEN** the PSR SHALL receive a -1 modifier

### Requirement: Piloting SPA — Terrain Master

The Terrain Master SPA SHALL ignore +1 piloting modifier for difficult terrain.

#### Scenario: Terrain Master difficult terrain bonus

- **WHEN** a pilot with Terrain Master moves through difficult terrain
- **THEN** the +1 piloting modifier for difficult terrain SHALL be ignored

### Requirement: Piloting SPA — Acrobat

The Acrobat SPA SHALL grant -1 to DFA piloting rolls.

#### Scenario: Acrobat DFA bonus

- **WHEN** a pilot with Acrobat makes a DFA attack
- **THEN** the DFA piloting roll SHALL receive a -1 modifier

### Requirement: Piloting SPA — Cross-Country

The Cross-Country SPA SHALL grant -1 PSR for terrain while running.

#### Scenario: Cross-Country running bonus

- **WHEN** a pilot with Cross-Country makes a PSR for terrain while running
- **THEN** the PSR SHALL receive a -1 modifier

### Requirement: Defensive SPA — Evasive

The Evasive SPA SHALL grant +1 TMM when running or jumping.

#### Scenario: Evasive running bonus

- **WHEN** a pilot with Evasive is running
- **THEN** the target movement modifier SHALL be increased by 1

#### Scenario: Evasive jumping bonus

- **WHEN** a pilot with Evasive is jumping
- **THEN** the target movement modifier SHALL be increased by 1

### Requirement: Defensive SPA — Natural Grace

The Natural Grace SPA SHALL grant -1 PSR for falls.

#### Scenario: Natural Grace fall bonus

- **WHEN** a pilot with Natural Grace makes a PSR for a fall
- **THEN** the PSR SHALL receive a -1 modifier

### Requirement: Misc SPA — Tactical Genius

The Tactical Genius SPA SHALL grant +1 to initiative rolls.

#### Scenario: Tactical Genius initiative bonus

- **WHEN** a force includes a pilot with Tactical Genius
- **THEN** the initiative roll SHALL receive a +1 modifier

### Requirement: Misc SPA — Pain Resistance

The Pain Resistance SPA SHALL allow the pilot to ignore the first wound's effects.

#### Scenario: Pain Resistance ignores first wound

- **WHEN** a pilot with Pain Resistance has 1 wound
- **THEN** the pilot wound to-hit modifier SHALL be 0 (first wound ignored)

#### Scenario: Pain Resistance with multiple wounds

- **WHEN** a pilot with Pain Resistance has 3 wounds
- **THEN** the pilot wound to-hit modifier SHALL be +2 (ignoring first wound: 3 - 1 = 2)

### Requirement: Misc SPA — Iron Man

The Iron Man SPA SHALL grant -2 to consciousness check target numbers.

#### Scenario: Iron Man consciousness check bonus

- **WHEN** a pilot with Iron Man makes a consciousness check
- **THEN** the consciousness check target number SHALL be reduced by 2

### Requirement: Misc SPA — Hot Dog

The Hot Dog SPA SHALL increase the heat threshold for shutdown checks by +3.

#### Scenario: Hot Dog delays shutdown

- **WHEN** a pilot with Hot Dog SPA has heat level 16
- **THEN** no shutdown check SHALL be required (effective threshold 17 instead of 14)

### Requirement: Misc SPA — Edge

The Edge SPA SHALL provide a trigger-based reroll system with 6 mek-specific triggers.

#### Scenario: Edge triggers for mek combat

- **WHEN** a pilot with Edge is in mek combat
- **THEN** Edge SHALL be usable for: (1) reroll to-hit, (2) reroll damage location, (3) reroll critical hit determination, (4) reroll PSR, (5) reroll consciousness check, (6) negate one critical hit
- **AND** each use of Edge SHALL consume one Edge point
- **AND** Edge points SHALL NOT regenerate during the game

#### Scenario: Edge point tracking

- **WHEN** a pilot uses Edge to reroll
- **THEN** their remaining Edge points SHALL decrease by 1
- **AND** when Edge points reach 0, no further Edge uses SHALL be permitted

#### Scenario: Edge state initialization

- **WHEN** a pilot with Edge enters combat
- **THEN** the system SHALL initialize an IEdgeState with maxPoints and remainingPoints
- **AND** usageHistory SHALL be an empty array

#### Scenario: Edge trigger validation

- **WHEN** checking if a pilot can use Edge
- **THEN** the system SHALL verify remainingPoints > 0
- **AND** the system SHALL verify the trigger is one of the 6 valid types

### Requirement: Misc SPA — Toughness

The Toughness SPA SHALL grant -1 to consciousness check target numbers.

#### Scenario: Toughness consciousness check bonus

- **WHEN** a pilot with Toughness makes a consciousness check
- **THEN** the consciousness check target number SHALL be reduced by 1

### Requirement: Misc SPA — Cool Under Fire

The Cool Under Fire SPA SHALL reduce heat generated per turn by 1.

#### Scenario: Cool Under Fire heat reduction

- **WHEN** a pilot with Cool Under Fire generates heat
- **THEN** the heat generated SHALL be reduced by 1 per turn

### Requirement: Misc SPA — Some Like it Hot

The Some Like it Hot SPA SHALL reduce heat to-hit penalty by 1 at all thresholds.

#### Scenario: Some Like it Hot heat penalty reduction

- **WHEN** a pilot with Some Like it Hot has heat-based to-hit penalties
- **THEN** the heat to-hit penalty SHALL be reduced by 1

### Requirement: Tactical SPA — Speed Demon

The Speed Demon SPA SHALL grant +1 hex when running at +1 heat.

#### Scenario: Speed Demon movement bonus

- **WHEN** a pilot with Speed Demon runs
- **THEN** the movement SHALL be increased by 1 hex
- **AND** heat generated SHALL be increased by 1

### Requirement: Tactical SPA — Combat Intuition

The Combat Intuition SPA SHALL allow movement before initiative winner in first round.

#### Scenario: Combat Intuition first round bonus

- **WHEN** the first round of combat begins
- **AND** a pilot has Combat Intuition
- **THEN** the pilot SHALL move before the initiative winner

### Requirement: Misc SPA — Multi-Target

The Multi-Target SPA SHALL reduce multi-target penalty.

#### Scenario: Multi-Target penalty reduction

- **WHEN** a pilot with Multi-Target fires at multiple targets
- **THEN** the multi-target penalty SHALL be reduced

### Requirement: Misc SPA — Iron Will

The Iron Will SPA SHALL grant -2 to consciousness check target numbers (alias for Iron Man).

#### Scenario: Iron Will consciousness check bonus

- **WHEN** a pilot with Iron Will makes a consciousness check
- **THEN** the consciousness check target number SHALL be reduced by 2

### Requirement: Piloting SPA — Heavy Lifter

The Heavy Lifter SPA SHALL allow carrying and throwing objects in physical combat.

#### Scenario: Heavy Lifter object manipulation

- **WHEN** a pilot with Heavy Lifter is in physical combat
- **THEN** the pilot SHALL be able to carry and throw objects

### Requirement: Piloting SPA — Animal Mimicry

The Animal Mimicry SPA SHALL grant -1 PSR modifier in specific terrain.

#### Scenario: Animal Mimicry terrain bonus

- **WHEN** a pilot with Animal Mimicry makes a PSR in their designated terrain
- **THEN** the PSR SHALL receive a -1 modifier

### Requirement: Tactical SPA — Antagonizer

The Antagonizer SPA SHALL force opponents to attack this unit first.

#### Scenario: Antagonizer target priority

- **WHEN** a pilot with Antagonizer is in combat
- **THEN** opponents SHALL be forced to attack this unit first

### Requirement: Abilities Field in State Interfaces

The system SHALL add an `abilities` field to `IAttackerState` and `ITargetState` for SPA integration.

#### Scenario: Abilities field on IAttackerState

- **WHEN** constructing an attacker state for to-hit calculation
- **THEN** the `abilities` field SHALL contain a readonly array of SPA identifiers for the pilot
- **AND** the field SHALL be optional for backward compatibility

#### Scenario: Abilities field on ITargetState

- **WHEN** constructing a target state for to-hit calculation
- **THEN** the `abilities` field SHALL contain a readonly array of SPA identifiers for the target's pilot
- **AND** the field SHALL be optional for backward compatibility

### Requirement: SPA Pipeline Integration

All SPAs SHALL be wired into the appropriate combat pipelines (to-hit, damage, PSR, heat, initiative).

#### Scenario: SPAs checked during to-hit calculation

- **WHEN** calculating to-hit modifiers
- **THEN** the system SHALL check the attacker's abilities for gunnery SPAs
- **AND** applicable SPA modifiers SHALL be included in the modifier list

#### Scenario: SPAs checked during PSR resolution

- **WHEN** resolving a piloting skill roll
- **THEN** the system SHALL check the pilot's abilities for piloting SPAs
- **AND** applicable SPA modifiers SHALL be applied to the PSR

### Requirement: Designation Lookup Contract

The combat modifier layer SHALL obtain every designation-dependent value
by calling `getPilotDesignation(pilot, spaId)` and SHALL NOT reach into
the pilot record directly.

#### Scenario: Modifier layer uses the helper

- **GIVEN** any designation-dependent SPA is being evaluated for an
  attack
- **WHEN** the modifier calculation needs the designated value
- **THEN** the code SHALL read the designation only via
  `getPilotDesignation(pilot, spaId)`
- **AND** code reviews SHALL reject any direct traversal of
  `pilot.abilities[].designation`

#### Scenario: Missing designation produces neutral result

- **GIVEN** a designation-dependent SPA is evaluated for a pilot where
  `getPilotDesignation` returns `undefined`
- **WHEN** the modifier calculation runs
- **THEN** the modifier SHALL evaluate to zero (no-op) rather than
  throwing
- **AND** a debug-level log SHALL note the missing designation
