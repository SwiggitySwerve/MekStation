## ADDED Requirements

### Requirement: Phase Damage PSR After Every Damage Phase

At the end of the Physical Attack phase the standalone runner SHALL queue one `20+_damage` PSR for every surviving unit that can fall under MegaMek 48fcb2f64 `Mek.canFall` (a BattleMech-like unit that is not prone) and whose `damageThisPhase` reached the threshold (`TWPhaseEndManager.java:239`, `TWGameManager.java:17843-17893`). The threshold SHALL be 20, or 30 for a dual cockpit with an active dedicated pilot. The weapon-hit path and the end-of-phase sweep SHALL use the same helper, and a unit SHALL carry at most one `20+_damage` PSR at a time.

#### Scenario: Physical damage crosses the threshold

- **GIVEN** two attackers each kick one standing BattleMech in the Physical Attack phase
- **WHEN** the target's `damageThisPhase` is 20 or more at the end of the phase
- **THEN** exactly one `20+_damage` PSR SHALL be pending on the target

#### Scenario: Below the threshold

- **WHEN** the target took less than 20 physical damage
- **THEN** no `20+_damage` PSR SHALL be queued

#### Scenario: A unit that cannot fall

- **WHEN** a prone unit or a unit that is not a BattleMech reaches 20 damage in a phase
- **THEN** no `20+_damage` PSR SHALL be queued

#### Scenario: Dual cockpit threshold

- **WHEN** a dual cockpit unit with a dedicated pilot takes 29 damage in a phase
- **THEN** no PSR SHALL be due
- **AND** at 30 damage one SHALL be due

### Requirement: Movement Terrain PSRs Follow The Pinned Rules

Movement terrain PSRs SHALL follow MegaMek 48fcb2f64. Every step that changes position into a water hex SHALL roll the entering-water PSR, including water to water and a jump landing (`Entity.checkWaterMove`, `Entity.java:9615-9639`; `MovePathHandler.java:1615`); a hex that is ice-covered water is walked on and SHALL NOT roll for water. There SHALL be no exiting-water roll and no running-through-rough roll. Ice SHALL follow reckless-movement semantics (`Entity.checkRecklessMove`, `Entity.java:9241-9290`): one `moving_on_ice` PSR for each non-jump step taken in a hex containing ice, including a turn made on the ice. Entering rubble above level 5 (ultra-rubble) SHALL add +1 (`Entity.checkRubbleMove`, `Entity.java:9556-9559`). The `exiting_water` and `running_rough_terrain` reason codes SHALL remain valid for older replays.

#### Scenario: Water to water rolls again

- **WHEN** a standing BattleMech walks from one water hex into another
- **THEN** an `entering_water` PSR SHALL be queued for that step

#### Scenario: Leaving water rolls nothing

- **WHEN** a BattleMech walks from a water hex onto clear ground
- **THEN** no PSR SHALL be queued

#### Scenario: Rough terrain rolls nothing

- **WHEN** a BattleMech runs into a rough hex
- **THEN** no PSR SHALL be queued

#### Scenario: Ice rolls on each step in the hex

- **WHEN** a BattleMech walks into an ice hex and then turns there
- **THEN** two `moving_on_ice` PSRs SHALL be queued
- **AND** a jump landing on the ice hex SHALL queue none

#### Scenario: Ultra-rubble

- **WHEN** a BattleMech enters a rubble hex of level 6
- **THEN** the `entering_rubble` PSR SHALL carry modifier +1
- **AND** at level 5 it SHALL carry modifier 0

### Requirement: Displacement Terrain PSRs

A unit forced into a hex by a displacement SHALL be given terrain PSRs only by `planDisplacementTerrainPSRs`, which follows `TWGameManager.doEntityDisplacement` (`TWGameManager.java:9771-9866`): building collapse for an overloaded building, the bog-down check for a BattleMech entering a bog-down hex whether or not it left one, and entering water for a BattleMech that can fall. There SHALL be no rubble, ice or exiting-water roll in a displacement. The PSRs SHALL carry no `movement-step` trigger source. The runner applies them for domino displacement.

#### Scenario: Domino into rubble over water

- **WHEN** a domino displacement moves a BattleMech into a hex with water over rubble
- **THEN** one `entering_water` PSR SHALL be queued and no `entering_rubble` PSR

#### Scenario: Domino between swamp hexes

- **WHEN** a domino displacement moves a BattleMech from a swamp hex into another swamp hex
- **THEN** a `swamp_bog_down` PSR SHALL be queued

### Requirement: Running With A Damaged Hip Or Gyro Rolls Once Per Move

A Run, Sprint or Evade move by a unit that can fall under MegaMek 48fcb2f64 `Mek.canFall` (a BattleMech-like unit that is not prone) SHALL queue exactly one running-with-damage PSR when the unit has gyro damage that counts or a hip critical on a leg that is not destroyed (`MovePathHandler.java:1283-1286`, `Entity.checkRunningWithDamage` `Entity.java:9138-9148`, `TWRulesPSR.checkRunningWithDamage` `TWRulesPSR.java:62-77`, `Mek.hasHipCrit`). A heavy-duty gyro SHALL ignore its first hit. A hip and a gyro together SHALL still queue one PSR, and a Walk or Jump SHALL queue none. One shared planner SHALL produce the PSR for the standalone runner, the interactive session, its AI, `GameEngine` movement and P2P host translation, which queue it right after `MovementDeclared` and before any terrain PSR. The PSR SHALL carry the `movement-step:<n>` trigger source of the last step of the path and the `running_damaged_gyro` reason code when the gyro damage counts, otherwise `running_damaged_hip`.

#### Scenario: A hip crit on a multi-hex run

- **WHEN** a BattleMech with a damaged hip runs three hexes
- **THEN** one `running_damaged_hip` PSR SHALL be queued, stamped with the last step

#### Scenario: Hip and gyro together

- **WHEN** a BattleMech with a damaged hip and one gyro hit runs
- **THEN** one PSR SHALL be queued, not two

#### Scenario: Heavy-duty gyro

- **WHEN** a BattleMech with a heavy-duty gyro and one gyro hit runs
- **THEN** no PSR SHALL be queued
- **AND** with two gyro hits one SHALL be queued

#### Scenario: Walking or jumping

- **WHEN** a BattleMech with a damaged hip or gyro walks or jumps
- **THEN** no running-with-damage PSR SHALL be queued

#### Scenario: A unit that cannot fall

- **WHEN** a prone unit or a unit that is not a BattleMech runs with a damaged hip or gyro
- **THEN** no running-with-damage PSR SHALL be queued

#### Scenario: Destroyed leg

- **WHEN** the only hip critical is on a destroyed leg
- **THEN** no running-with-damage PSR SHALL be queued

### Requirement: Sideslip And Flanking PSRs Are Not Queued For BattleMechs

Controlled-sideslip and flanking-and-turning PSRs SHALL NOT be queued for a BattleMech by any movement path. MegaMek 48fcb2f64 calls `Entity.checkSideSlip` (`Entity.java:14083-14123`) only for VTOL, hover and WiGE-with-clearance movement (`MovePathHandler.java:3715-3727`; the client prediction in `SharedUtility.java:397-402` has the same gate). The `controlled_sideslip` and `flanking_and_turning` reason codes, their factories, and the Maneuvering Ace relief on a pending `flanking_and_turning` PSR SHALL remain so older replays and journals parse and resolve. Vehicle production of these PSRs, with the skid and motive-damage outcome, belongs to the vehicle combat matrix.

#### Scenario: A BattleMech runs and turns

- **WHEN** a BattleMech runs two hexes, turns, and moves again
- **THEN** no `flanking_and_turning` PSR SHALL be queued

#### Scenario: A Maneuvering Ace lateral shift

- **WHEN** a BattleMech with Maneuvering Ace makes a walking or running lateral shift
- **THEN** no `controlled_sideslip` PSR SHALL be queued

#### Scenario: Older journals

- **WHEN** a journal holds a pending `flanking_and_turning` PSR for a pilot with Maneuvering Ace
- **THEN** it SHALL resolve with the `-1` Maneuvering Ace modifier as before

## MODIFIED Requirements

### Requirement: PSR Trigger — Movement with Damage

The system SHALL trigger one PSR per move when a unit that can fall runs, sprints or evades with a damaged hip actuator or damaged gyro, as specified by "Running With A Damaged Hip Or Gyro Rolls Once Per Move".

#### Scenario: Running with damaged hip

- **WHEN** a unit with a damaged hip actuator attempts to run
- **THEN** one PSR SHALL be required for the move, not one for each hex

#### Scenario: Running with damaged gyro

- **WHEN** a unit with gyro damage that counts attempts to run
- **THEN** one PSR SHALL be required with the +3 per gyro hit modifier

### Requirement: PSR Reason Code Discriminated Field

`IPSRTriggeredPayload`, `IPSRResolvedPayload`, and `IUnitFellPayload` SHALL carry a `reasonCode?: PSRTrigger` field discriminated against the canonical 34-value `PSRTrigger` enum at `src/types/gameplay/PSRTriggerCodes.ts` (re-exported by `src/utils/gameplay/pilotingSkillRolls/types.ts`). The field is OPTIONAL on every payload to preserve back-compat with NDJSON event streams written before this contract.

The free-string `reason` field on the same payloads SHALL be RETAINED unchanged for display continuity. Display consumers (`EventLogDisplay`, the Python `format-event-log.py`) read `reason` to render human-readable text. Filter / aggregate consumers (`EventLogQuery`, `MetricsCollector`, scenario tests) read `reasonCode` for machine-readable filtering.

The 34 canonical codes (cross-referenced against MegaMek's `Server.processPilotingRolls` and `MovePathHandler.checkSkid` taxonomy):

| Code | Category | Trigger |
|---|---|---|
| `20+_damage` | damage | Phase damage threshold of 20+ |
| `leg_damage` | damage | Internal structure exposed on a leg |
| `hip_actuator_destroyed` | damage | Hip actuator critically destroyed |
| `gyro_hit` | damage | Gyro slot took a critical hit |
| `engine_hit` | damage | Engine slot took a critical hit (cumulative) |
| `upper_leg_actuator_hit` | damage | Upper leg actuator destroyed |
| `lower_leg_actuator_hit` | damage | Lower leg actuator destroyed |
| `foot_actuator_hit` | damage | Foot actuator destroyed |
| `kicked` | movement | Target was kicked (physical attack target) |
| `charged` | movement | Target was charged (physical attack target) |
| `dfa_target` | movement | Target was hit by death-from-above |
| `pushed` | movement | Target was pushed (physical attack target) |
| `domino_effect` | movement | Unit was forced along an occupied-hex domino displacement chain |
| `kick_miss` | movement | Attacker missed a kick (self-PSR) |
| `charge_miss` | movement | Attacker missed a charge (self-PSR) |
| `dfa_miss` | movement | Attacker missed a DFA (self-PSR) |
| `entering_rubble` | movement | Unit entered rubble terrain |
| `running_rough_terrain` | movement | Unit ran through rough terrain |
| `moving_on_ice` | movement | Unit moved on an ice hex |
| `entering_water` | movement | Unit entered a water hex |
| `exiting_water` | movement | Unit exited a water hex |
| `skidding` | movement | Skid PSR triggered by unstable ground |
| `swamp_bog_down` | movement | Unit entered swamp and bogged down |
| `airmek_landing` | movement | AirMek landing-control PSR triggered |
| `running_damaged_hip` | movement | Unit ran with a damaged hip |
| `running_damaged_gyro` | movement | Unit ran with a damaged gyro |
| `controlled_sideslip` | movement | Controlled lateral movement required a PSR (VTOL, hover and WiGE only; never queued for a BattleMech, kept so older replays parse) |
| `flanking_and_turning` | movement | Running or sprinting unit turned after moving more than one hex (VTOL, hover and WiGE only; never queued for a BattleMech, kept so older replays parse) |
| `out_of_control` | movement | Movement became out of control and required a PSR |
| `building_collapse` | movement | Building under unit's footprint collapsed |
| `masc_failure` | movement | MASC system failed during attempted run |
| `supercharger_failure` | movement | Supercharger failed during attempted run |
| `heat_shutdown` | heat | Heat-induced shutdown PSR |
| `standing_up` | recovery | Prone unit attempting to stand |

The runner SHALL populate `reasonCode` at the PSR factory boundary — every factory in `src/utils/gameplay/pilotingSkillRolls/combatFactories.ts`, `damageFactories.ts`, `environmentFactories.ts`, and `systemFactories.ts`, and every phase-check adapter in `phaseChecks.ts`, SHALL populate `reasonCode` (the matching `PSRTrigger` enum value) on the returned `IPendingPSR`; when that PSR is emitted as an `IPSRTriggeredPayload`, the event boundary SHALL carry the optional field alongside `reason` (human string, unchanged).

#### Scenario: Factory populates reasonCode alongside reason

- **GIVEN** a kick-target PSR factory call (`createKickedPSR(unit, attackerId)`)
- **WHEN** the factory returns a `IPSRTriggeredPayload`
- **THEN** the payload SHALL have `reason: 'Kicked'` (existing human-readable string)
- **AND** the payload SHALL have `reasonCode: PSRTrigger.Kicked` (the canonical `'kicked'` enum value)

#### Scenario: Damage-induced PSR populates damage code

- **GIVEN** a unit takes 20+ damage in a phase, triggering `createPhaseDamage20PlusPSR(unit)`
- **WHEN** the factory returns a `IPSRTriggeredPayload`
- **THEN** the payload SHALL have `reasonCode: PSRTrigger.PhaseDamage20Plus`

#### Scenario: Movement-induced terrain PSR populates terrain code

- **GIVEN** a unit moving on an ice hex triggers `createIcePSR(unit)`
- **WHEN** the factory returns a `IPSRTriggeredPayload`
- **THEN** the payload SHALL have `reasonCode: PSRTrigger.MovingOnIce`

#### Scenario: Legacy event stream without reasonCode replays cleanly

- **GIVEN** an NDJSON event stream written before this requirement (no `reasonCode` field on any PSR event)
- **WHEN** consumers process the events
- **THEN** processing SHALL succeed
- **AND** consumers MAY render `reason` (the human-readable string) directly without falling back through `reasonCode`
