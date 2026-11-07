## ADDED Requirements

### Requirement: Native Unit Piloting Quirk Identity

The system SHALL recognize the pinned MegaMek unit design quirk id
`easy_pilot` through the shared unit-quirk membership owner.
Native and legacy spellings SHALL identify the same boolean quirk without
rewriting saved keys, adding duplicate modifiers, or changing the existing
PSR reason, terrain and base-piloting eligibility rules.

#### Scenario: Native Easy Pilot reaches interactive PSR events

- **GIVEN** an ordinary unit with base piloting 5 and a damage PSR
- **WHEN** the unit has the native `easy_pilot` design quirk
- **THEN** the resolved PSR target number SHALL be 4
- **AND** the interactive event SHALL record the -1 quirk modifier

#### Scenario: Native Easy Pilot retains existing eligibility

- **GIVEN** a unit with the native `easy_pilot` design quirk
- **WHEN** its base piloting is greater than 3 and the PSR is terrain or phase damage
- **THEN** the existing Easy Pilot relief SHALL apply
- **WHEN** its base piloting is 3 or the PSR is leg damage or standing up
- **THEN** Easy Pilot SHALL add no relief

#### Scenario: Native and saved spellings are one quirk

- **WHEN** `easy_pilot` is looked up as `easy_to_pilot` or vice versa
- **THEN** the shared membership owner SHALL recognize the same quirk
- **AND** duplicate native and legacy spellings SHALL apply its modifier once
- **AND** unknown ids SHALL retain exact-match behavior without prefix matching

#### Scenario: Native Easy and merged Hard Pilot coexist with inactive DNI

- **GIVEN** native Easy Pilot and Hard Pilot with base piloting 5
- **WHEN** a damage PSR resolves with missing or inactive native DNI context
- **THEN** Easy Pilot's -1 and explicit Hard Pilot's +1 SHALL cancel
- **AND** the replayed PSR event SHALL record target number 5

#### Scenario: Active native DNI preserves Easy Pilot relief

- **GIVEN** both native quirks and a qualifying DNI implant
- **WHEN** the public native activity query grants the benefit from retained session mode and hardware
- **THEN** Hard Pilot SHALL add no penalty and Easy Pilot relief SHALL remain
- **AND** the represented legacy flag SHALL remain independent of native activity

### Requirement: Native Target Airborne Prerequisite

Weapon-attack target hydration SHALL derive the native airborne disjunction
from transported combat state and existing target-hex terrain, replacing the
independent represented flag. Pinned MegaMek `48fcb2f64`
`Entity.java:14126-14148,15944-15948` and `IAero.java:945-979` SHALL determine
the supported aerospace and VTOL/WiGE behavior. This prerequisite SHALL NOT
add the Anti-Air quirk modifier or infer flight for other families.

#### Scenario: Aerospace flight mode survives zero altitude and destruction

- **GIVEN** a transported aerospace lifecycle in flight mode
- **WHEN** altitude is zero, including the native liftOff(0) case
- **THEN** the target SHALL remain airborne through session and serialized replay
- **AND** destruction SHALL gate positive altitude only, preserving the independent flight-mode branch
- **WHEN** lifecycle is grounded and altitude is zero
- **THEN** the derived target SHALL be grounded regardless of a represented true flag

#### Scenario: VTOL and WiGE elevation respects roof and bridge heights

- **GIVEN** a nondestroyed VTOL or WiGE at positive relative elevation
- **WHEN** the target hex has a building or bridge level at least that elevation
- **THEN** the derived target SHALL be grounded
- **OTHERWISE** the derived target SHALL be airborne
- **AND** destruction SHALL make this VTOL/WiGE predicate false

#### Scenario: Existing terrain reaches declaration and projection

- **GIVEN** target terrain already recorded in GameCreated or a subsequent terrain override
- **WHEN** an attack is declared, projected per volley or per weapon, or reconstructed from serialized events
- **THEN** target hydration SHALL use the current terrain for the native airborne fact
- **AND** unrelated SPA terrain consumers SHALL retain their existing input contract
- **AND** absent native state SHALL NOT be replaced with the represented flag

### Requirement: Native Unit Anti-Air Targeting

The shared unit-quirk to-hit owner SHALL apply -2 once when the attacker has
native `anti_air` and the Entity target has an established native airborne
fact. This SHALL follow pinned MegaMek `48fcb2f64` `Quirks.java:75` and
`ComputeAbilityMods.java:64-68`, consuming the shared
isAirborneVTOLorWIGE OR isAirborne result without duplicating its predicates.

#### Scenario: Native source key reaches session and replay attacks

- **GIVEN** converted unit metadata carrying native `anti_air`
- **WHEN** public to-hit calculation or an event-sourced attack declaration targets airborne aerospace, VTOL or WiGE
- **THEN** the attack SHALL receive one -2 Anti-Air modifier
- **AND** serialized replay SHALL retain the quirk and declared modifier
- **AND** a zero-altitude aerospace target in flight mode SHALL qualify

#### Scenario: Grounded and unknown targets do not qualify

- **WHEN** the target's native airborne result is false or unestablished
- **THEN** Anti-Air SHALL add no modifier, including roof/bridge-supported VTOL/WiGE
- **AND** a target-side Anti-Air quirk SHALL NOT benefit the attacker
- **AND** duplicate ids SHALL NOT multiply the benefit or near-match ids create it

#### Scenario: Other attack modifiers remain additive

- **WHEN** an Anti-Air attack also has range, movement or other unit/weapon modifiers
- **THEN** those modifiers and existing to-hit clamping SHALL retain their behavior
- **AND** attacks without native Anti-Air SHALL retain their existing numerical outputs

### Requirement: Native Prototype BattleMech Ranged Critical Determination

BattleMech ranged damage resolution SHALL add +2 to the critical determination
roll when the damaged unit has native `prototype`, following pinned MegaMek
`48fcb2f64` `TWGameManager.java:23257-23258,23290-23308`. The shared quirk
owner SHALL define the penalty once. Duplicate ids SHALL NOT multiply it.
Other families and physical attacks SHALL remain outside this bounded slice.

#### Scenario: Source identity reaches session and replay critical checks

- **GIVEN** native Prototype metadata retained by the existing hydration owner
- **WHEN** BattleMech ranged damage makes a normal critical determination
- **THEN** a raw roll of 6 SHALL determine one critical, 8 two and 10 three
- **AND** session, runner and serialized replay SHALL retain the resulting effects
- **AND** the penalty SHALL belong to the damaged unit, not the attacker

#### Scenario: Existing modifiers and forced checks preserve their contracts

- **WHEN** a Prototype target also receives a Low Profile glancing blow
- **THEN** its +2 SHALL add to Low Profile's -2 without undoing half damage
- **WHEN** a forced single critical or the existing armored TAC path resolves
- **THEN** Prototype SHALL NOT introduce a new determination roll or extra hits
- **AND** outputs without Prototype SHALL retain their existing values

### Requirement: Native Weak Legs Physical Critical Checks

The unit-quirk owner SHALL supply extra normal critical determinations for
native `weak_legs` following MegaMek `48fcb2f64`
`TWGameManager.java:12869-12872,17207-17217`. Session and runner physical
resolution SHALL consume the same requests after the relevant damage,
reusing the existing critical and event owners.

#### Scenario: A successful kick checks the actual location through intact armor

- **GIVEN** a kicked BattleMech has native Weak Legs
- **WHEN** the kick hits, even when its damage leaves armor intact
- **THEN** one extra normal critical determination SHALL use the actual hit location
- **AND** a determination below the critical threshold SHALL produce no critical
- **AND** an attacker-side Weak Legs flag SHALL NOT give the target a check

#### Scenario: Successful DFA checks all native attacker leg locations in order

- **GIVEN** a successful DFA attacker has native Weak Legs
- **THEN** extra normal determinations SHALL check left leg then right leg
- **AND** a quad SHALL additionally check left arm then right arm, in that order
- **WHEN** the DFA misses or only the target has Weak Legs
- **THEN** this rule SHALL add no checks

#### Scenario: Critical state survives serialization without changing controls

- **WHEN** existing source metadata reaches the physical critical checks
- **THEN** resolved component effects and critical limb loss SHALL survive session serialization and replay
- **AND** duplicate native flags SHALL NOT multiply requests or near ids match
- **AND** existing forced-single callers and outputs without Weak Legs SHALL remain unchanged
- **AND** broader critical-system and ammunition-consequence parity SHALL remain separate

## MODIFIED Requirements

### Requirement: Piloting Quirk — Hard to Pilot

The explicit Hard to Pilot quirk SHALL impose +1 to PSRs when native DNI is
inactive, following MegaMek `48fcb2f64` `Entity.java:8939-8946`. Native
`hard_pilot` and saved `hard_to_pilot` SHALL identify the same quirk without
double counting. The SPA domain's native activity query SHALL interpret the
supplied game mode, implant identities and verified DNI cockpit hardware;
missing mode means inactive. The represented legacy jack-in flag SHALL NOT
substitute for native activity.

#### Scenario: Hard to Pilot PSR penalty

- **WHEN** a unit with Hard to Pilot makes a PSR with inactive native DNI
- **THEN** the PSR target number SHALL be increased by 1

#### Scenario: Active native DNI suppresses the explicit quirk penalty

- **GIVEN** a pilot with VDNI, Buffered VDNI or Prototype DNI
- **WHEN** the native mode is Pilot Abilities Only, or Full Tracking with verified DNI cockpit hardware
- **THEN** Hard to Pilot SHALL add no penalty independently of represented SPA arithmetic

#### Scenario: Missing or unrecognized native context remains inactive

- **WHEN** native mode is missing, Off or unrecognized, or Full Tracking lacks verified hardware or a DNI implant
- **THEN** the explicit quirk SHALL still add +1
- **AND** EI, BA NIU and the represented flag SHALL NOT establish native activity

#### Scenario: Explicit session context survives replay into the game effect

- **GIVEN** native mode and hardware supplied through GameCreated
- **WHEN** a pending PSR resolves after replay
- **THEN** the explicit Hard Pilot penalty SHALL use those retained inputs
- **AND** higher-level option authoring, AirMek landing PSRs and DNI-induced quirk synthesis remain separate requirements

### Requirement: Weapon Quirk — Improved/Poor/No Cooling

Weapon cooling quirks SHALL modify heat generated by the specific fired
weapon through one shared owner, following MegaMek `48fcb2f64`
`WeaponMounted.java:167-178`. Native `imp_cooling` and saved
`improved_cooling` SHALL identify one boolean flag. Improved, Poor and No
Cooling SHALL apply independently in that order, once per flag.

#### Scenario: Improved Cooling weapon

- **WHEN** a weapon with the Improved Cooling quirk is fired
- **THEN** its heat SHALL be reduced by 1 with a minimum of 1 before other cooling-quirk additions

#### Scenario: Poor Cooling weapon

- **WHEN** a weapon with the Poor Cooling quirk is fired
- **THEN** the weapon SHALL generate 1 more heat than normal

#### Scenario: No Cooling weapon

- **WHEN** a weapon with the No Cooling quirk is fired
- **THEN** the weapon SHALL generate 2 more heat than normal

#### Scenario: Independent cooling flags and duplicate aliases

- **GIVEN** a heat10 weapon with Improved, Poor and No Cooling
- **WHEN** the firing heat is evaluated
- **THEN** its heat SHALL be 12 after the ordered independent changes
- **AND** duplicate flags or both Improved Cooling spellings SHALL NOT repeat a change

#### Scenario: Native source quirk reaches both heat phases

- **GIVEN** a native weapon-quirk list supplied to the existing fired-mount context
- **WHEN** interactive or autonomous heat resolves
- **THEN** the same cooling rule SHALL modify that weapon's firing heat
- **AND** another same-name mount without that flag SHALL retain its own heat
- **AND** replay SHALL retain the interactive firing-heat result
