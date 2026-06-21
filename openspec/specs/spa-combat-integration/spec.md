# spa-combat-integration Specification

## Purpose

Defines SPA Combat Integration requirements for Gunnery SPA - Weapon Specialist, Gunnery SPA - Gunnery Specialist, Gunnery SPA - Blood Stalker, and Gunnery SPA - Range Master, preserving the source-of-truth scope introduced by archived change full-combat-parity.

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

The Sandblaster SPA SHALL grant source-backed range-based cluster-table modifiers for the pilot's designated weapon type: `+4` at short range, `+3` beyond short through medium, and `+2` beyond medium. It SHALL take precedence over Cluster Hitter when both could apply. MekStation SHALL currently apply this only to represented LB-X and missile cluster-table resolution, while UAC/RAC and TacOps rapid-fire AC rate-of-fire Sandblaster behavior remains an explicit gap.

#### Scenario: Sandblaster designated cluster-table bonus

- **WHEN** a pilot with Sandblaster fires the designated LB-X or missile cluster-table weapon
- **THEN** the cluster hit roll SHALL receive the source-backed range bonus
- **AND** UAC/RAC rate-of-fire behavior SHALL remain helper-only until modeled

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

When an attacker with Jumping Jack jumped, the jump-movement to-hit penalty (normally +3) SHALL be reduced to +1. The SPA SHALL NOT affect any piloting-skill-roll calculation.

#### Scenario: Attacker with Jumping Jack jumps and fires

- **GIVEN** an attacker with the Jumping Jack SPA who jumped this turn
- **WHEN** the to-hit modifier is computed
- **THEN** the jumping-attacker penalty SHALL be +1 (reduced from +3)

#### Scenario: Attacker with Jumping Jack did not jump

- **GIVEN** an attacker with the Jumping Jack SPA who walked this turn
- **WHEN** the to-hit modifier is computed
- **THEN** no Jumping Jack modifier SHALL apply
- **AND** the standard walking penalty (+1) SHALL apply

#### Scenario: Jumping Jack no longer affects PSRs

- **GIVEN** an attacker with the Jumping Jack SPA who triggers a piloting-skill roll
- **WHEN** the PSR modifiers are aggregated
- **THEN** Jumping Jack SHALL NOT contribute any modifier to the PSR

### Requirement: Piloting SPA - Hopping Jack

The Hopping Jack SPA SHALL modify the attacker's to-hit when the attacker jumped this turn, NOT the target's piloting roll.

When an attacker with Hopping Jack jumped, the jump-movement to-hit penalty (normally +3) SHALL be reduced to +2. If an attacker has both Jumping Jack and Hopping Jack, Jumping Jack SHALL take precedence because it grants the stronger jump-attack relief.

#### Scenario: Attacker with Hopping Jack jumps and fires

- **GIVEN** an attacker with the Hopping Jack SPA who jumped this turn
- **WHEN** the to-hit modifier is computed
- **THEN** the jumping-attacker penalty SHALL be +2 (reduced from +3)

#### Scenario: Attacker with Hopping Jack did not jump

- **GIVEN** an attacker with the Hopping Jack SPA who walked this turn
- **WHEN** the to-hit modifier is computed
- **THEN** no Hopping Jack modifier SHALL apply
- **AND** the standard walking penalty (+1) SHALL apply

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

### Requirement: Piloting SPA - Terrain Master: Frogman

The Terrain Master: Frogman SPA SHALL grant -1 to physical attack to-hit numbers only when a Mek or ProtoMech attacker occupies depth-2 or deeper water. It SHALL also grant -1 to entering-water PSRs only when a Mek or ProtoMech unit enters depth-2 or deeper water.

#### Scenario: Frogman physical attack bonus

- **WHEN** a Mek or ProtoMech pilot with Terrain Master: Frogman makes a physical attack from depth-2 or deeper water
- **THEN** the physical attack SHALL receive a -1 to-hit modifier

#### Scenario: Frogman shallow-water and target-only boundary

- **WHEN** a pilot with Terrain Master: Frogman makes a physical attack from depth-1 or shallower water
- **THEN** no Frogman to-hit modifier SHALL apply
- **WHEN** only the target occupies water
- **THEN** no Frogman to-hit modifier SHALL apply

#### Scenario: Frogman water-entry PSR bonus

- **WHEN** a Mek or ProtoMech pilot with Terrain Master: Frogman enters depth-2 or deeper water
- **THEN** the entering-water PSR SHALL receive a -1 Frogman modifier

#### Scenario: Frogman water-entry PSR boundaries

- **WHEN** a pilot with Terrain Master: Frogman enters depth-1 or shallower water
- **THEN** no Frogman PSR modifier SHALL apply
- **WHEN** an explicit non-Mek/non-ProtoMek unit with Terrain Master: Frogman enters depth-2 or deeper water
- **THEN** no Frogman PSR modifier SHALL apply

### Requirement: Piloting SPA - Terrain Master: Mountaineer

The Terrain Master: Mountaineer SPA SHALL grant -1 to entering-rubble PSRs when a unit with `tm_mountaineer` or `terrain-master-mountaineer` has a pending entering-rubble PSR.

#### Scenario: Mountaineer rubble-entry PSR bonus

- **WHEN** a pilot with Terrain Master: Mountaineer enters rubble and the entering-rubble PSR is resolved
- **THEN** the PSR SHALL receive a -1 Mountaineer modifier

#### Scenario: Mountaineer non-rubble PSR boundary

- **WHEN** a pilot with Terrain Master: Mountaineer resolves a non-rubble PSR
- **THEN** no Mountaineer PSR modifier SHALL apply

### Requirement: Piloting SPA - Terrain Master: Forest Ranger

The Terrain Master: Forest Ranger SPA SHALL grant +1 enemy to-hit only when the target owns `tm_forest_ranger`, moved by walking, and occupies wooded terrain.

#### Scenario: Forest Ranger walking woods defense

- **WHEN** a pilot with Terrain Master: Forest Ranger is targeted after walking in woods
- **THEN** attacks against that unit SHALL receive a +1 to-hit modifier

#### Scenario: Forest Ranger requires walking and woods

- **WHEN** a pilot with Terrain Master: Forest Ranger is targeted after running in woods
- **THEN** no Forest Ranger to-hit modifier SHALL apply
- **WHEN** the same pilot walked outside wooded terrain
- **THEN** no Forest Ranger to-hit modifier SHALL apply

### Requirement: Piloting SPA - Terrain Master: Swamp Beast

The Terrain Master: Swamp Beast SPA SHALL grant +1 enemy to-hit only when the target owns `tm_swamp_beast`, moved by running, and occupies mud or swamp terrain. MegaMek's Swamp Beast bog-down PSR relief SHALL apply as `-1` to swamp bog-down PSRs, and swamp bog-down SHALL resolve through `UnitStuck`/`isStuck` instead of a normal failed-PSR fall.

#### Scenario: Swamp Beast running mud or swamp defense

- **WHEN** a pilot with Terrain Master: Swamp Beast is targeted after running in mud or swamp
- **THEN** attacks against that unit SHALL receive a +1 to-hit modifier

#### Scenario: Swamp Beast requires running and mud or swamp

- **WHEN** a pilot with Terrain Master: Swamp Beast is targeted after walking in swamp
- **THEN** no Swamp Beast to-hit modifier SHALL apply
- **WHEN** the same pilot ran outside mud or swamp
- **THEN** no Swamp Beast to-hit modifier SHALL apply

#### Scenario: Swamp Beast bog-down relief applies to stuck-state PSRs

- **WHEN** a BattleMech with Terrain Master: Swamp Beast enters swamp
- **THEN** the combat PSR resolver SHALL apply a `-1` Swamp Beast modifier to the swamp bog-down PSR
- **AND** a failed swamp bog-down PSR SHALL mark the unit stuck instead of applying a fall outcome

### Requirement: Piloting SPA — Acrobat

The Acrobat SPA SHALL grant -1 to DFA piloting rolls.

#### Scenario: Acrobat DFA bonus

- **WHEN** a pilot with Acrobat makes a DFA attack
- **THEN** the DFA piloting roll SHALL receive a -1 modifier

### Requirement: Piloting SPA — Cross-Country

The Cross-Country SPA SHALL remain an explicit non-BattleMech combat-vehicle movement/passability scope split until a vehicle combat matrix owns the mechanic. The BattleMech PSR resolver SHALL NOT claim Cross-Country as a terrain PSR modifier.

#### Scenario: Cross-Country remains outside BattleMech PSRs

- **WHEN** the BattleMech combat validation catalog is generated
- **THEN** Cross-Country SHALL be marked unsupported for the BattleMech matrix with MegaMek source references to combat-vehicle movement/passability behavior
- **AND** the PSR resolver assignment SHALL NOT include Cross-Country as a terrain PSR modifier

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

The Tactical Genius SPA SHALL be modeled as an initiative reroll gate, not as a flat initiative-roll bonus.

#### Scenario: Tactical Genius is not a flat initiative bonus

- **WHEN** a force includes a pilot with Tactical Genius
- **THEN** the force SHALL NOT receive a flat numeric initiative-roll modifier
- **AND** reroll request/replacement-roll flow SHALL be tracked separately from flat initiative bonuses

### Requirement: Misc SPA — Pain Resistance

The Pain Resistance SPA SHALL apply only to source-backed consciousness-roll and ammunition-explosion pilot-damage behavior. It SHALL NOT reduce ranged attack wound penalties or generic to-hit wound modifiers.

#### Scenario: Pain Resistance does not reduce ranged wound penalties

- **WHEN** a pilot with Pain Resistance has wounds during a ranged attack
- **THEN** the ranged attack to-hit modifier SHALL use the raw wound penalty

#### Scenario: Pain Resistance applies to source-backed consciousness and explosion paths

- **WHEN** a pilot with Pain Resistance rolls for consciousness or takes ammunition-explosion pilot damage
- **THEN** the supported combat path SHALL apply only the source-backed consciousness or explosion effect

### Requirement: Misc SPA — Iron Man

The Iron Man SPA SHALL reduce BattleMech ammunition-explosion pilot hits where that source-backed explosion path is wired. It SHALL NOT grant generic consciousness check target-number relief.

#### Scenario: Iron Man is not generic consciousness relief

- **WHEN** a pilot with Iron Man makes a consciousness check
- **THEN** the consciousness check target number SHALL NOT be reduced by Iron Man

### Requirement: Misc SPA — Hot Dog

The Hot Dog SPA SHALL reduce heat startup and shutdown target numbers by 1 without changing the heat 14 shutdown-check threshold.

#### Scenario: Hot Dog modifies shutdown

- **WHEN** a pilot with Hot Dog SPA has heat level 14
- **THEN** a shutdown check SHALL be required
- **AND** the shutdown target number SHALL be 3 instead of 4

### Requirement: Misc SPA — Edge

The Edge SPA SHALL provide MegaMek-style trigger-based Edge options for BattleMech and aerospace combat.

#### Scenario: Edge triggers for mek combat

- **WHEN** a pilot with Edge is in mek combat
- **THEN** BattleMech Edge SHALL be usable for: head-hit location reroll, through-armor-critical location reroll, pilot-KO reroll, critical-explosion reroll, and MASC/Supercharger failure reroll
- **AND** aerospace Edge SHALL expose altitude-loss, critical-explosion, pilot-KO, lucky-critical, nuke-critical, and transported-cargo-loss triggers
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
- **AND** the system SHALL verify the trigger is one of the MegaMek-derived Edge option ids

### Requirement: Misc SPA — Toughness

RPG Toughness SHALL be represented as explicit numeric `pilotToughness` combat state that lowers consciousness check target numbers by that nonnegative integer. A legacy Toughness ability string SHALL NOT imply RPG Toughness relief.

#### Scenario: Explicit RPG Toughness state lowers consciousness targets

- **WHEN** a pilot with `pilotToughness=1` makes a consciousness check
- **THEN** the consciousness check target number SHALL be reduced by 1

#### Scenario: Legacy Toughness ability string is inert

- **WHEN** a pilot has a `toughness` ability string without explicit `pilotToughness`
- **THEN** the consciousness check target number SHALL NOT be reduced

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

The Iron Will SPA SHALL remain a local legacy alias boundary for BattleMech combat validation until source-backed behavior is represented. It SHALL NOT grant generic consciousness check target-number relief.

#### Scenario: Iron Will is not generic consciousness relief

- **WHEN** a pilot with Iron Will makes a consciousness check
- **THEN** the consciousness check target number SHALL NOT be reduced by Iron Will

### Requirement: Piloting SPA — Heavy Lifter

The Heavy Lifter SPA SHALL represent pickup/drop carried-object lifecycle separately from unresolved throw-object action resolution in the BattleMech combat matrix. Source-backed MegaMek behavior SHALL be recorded as a represented carry-object capacity-check helper, `1.5x` ground-object lift-capacity multiplier for BattleMechs with arms, represented pickup/drop carried-object state lifecycle, and per-arm carried-cargo physical legality lockout for the occupied arm, not as a generic physical attack damage or to-hit modifier.

#### Scenario: Heavy Lifter lift capacity remains action-gated

- **WHEN** the BattleMech combat validation catalog is generated
- **THEN** Heavy Lifter lift-capacity helper support SHALL be marked integrated with MegaMek source references to `1.5x` ground-object lift capacity
- **AND** Heavy Lifter carry-object capacity-check support SHALL be marked integrated only for the represented helper calculation
- **AND** represented pickup/drop carried-object events SHALL author object payload state, carried-by state, arm occupancy, and overweight no-side-effect rejection
- **AND** represented per-arm carried-cargo state SHALL lock out physical attacks for the occupied arm
- **AND** the catalog SHALL keep throw-object physical combat actions/resolution as a separate helper-only gap

### Requirement: Piloting SPA - Shaky Stick

The Shaky Stick SPA SHALL apply as a source-backed ground-to-air defender to-hit modifier in the BattleMech combat matrix. MegaMek behavior SHALL be represented as a `+1` modifier only when an airborne target is attacked by a non-airborne attacker, not as a generic BattleMech target movement, terrain, or PSR modifier. VTOL/WIGE-specific airborne subtype parity SHALL remain outside this BattleMech matrix until richer movement-state hydration exists.

#### Scenario: Shaky Stick applies only to ground-to-air attacks

- **WHEN** the BattleMech combat validation catalog is generated
- **THEN** Shaky Stick SHALL be marked integrated with MegaMek source references to the ground-to-air defender to-hit behavior
- **AND** airborne target and non-airborne attacker state SHALL gate the modifier

### Requirement: Piloting SPA — Animal Mimicry

The Animal Mimicry SPA SHALL grant a -1 PSR modifier to explicit quad BattleMechs.

#### Scenario: Animal Mimicry quad-Mek bonus

- **WHEN** a quad BattleMech pilot with Animal Mimicry makes a PSR
- **THEN** the PSR SHALL receive a -1 modifier
- **AND** non-quad units SHALL NOT receive the Animal Mimicry modifier

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
