# piloting-skill-rolls Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.
## Requirements
### Requirement: PSR Resolution Mechanic

Failed AirMek landing PSRs SHALL use the current fall-resolution event model
with fall height taken from the runtime landing-control payload and tonnage
taken from the represented unit when available.

#### Scenario: Failed AirMek landing PSR uses represented unit tonnage

- **GIVEN** an AirMek landing-control payload carries a landing fall height
- **AND** the interactive session has represented catalog tonnage for the unit
- **WHEN** the landing PSR fails
- **THEN** the emitted `UnitFell` event SHALL carry fall damage based on that
  fall height and represented tonnage under the current MekStation fall model
- **AND** synthetic sessions with no represented tonnage SHALL retain the legacy
  fallback tonnage.

### Requirement: PSR Trigger — 20+ Phase Damage

The system SHALL trigger a PSR when a unit takes 20 or more total damage in a single phase.

#### Scenario: Accumulating 20+ damage in weapon attack phase

- **WHEN** a unit accumulates 20 or more points of damage during the weapon attack phase
- **THEN** a PSR SHALL be queued with the trigger "20+ damage"
- **AND** the PSR SHALL have no additional modifiers beyond standard

### Requirement: PSR Trigger — Leg Damage

The system SHALL trigger a PSR when a leg location takes damage that exposes internal structure.

#### Scenario: Leg armor breached

- **WHEN** a leg location's armor is reduced to 0 and structure takes damage
- **THEN** a PSR SHALL be triggered for leg damage

### Requirement: PSR Trigger — Hip Actuator Damage

The system SHALL trigger a PSR when a hip actuator is critically hit.

#### Scenario: Hip actuator critical hit

- **WHEN** a hip actuator receives a critical hit
- **THEN** a PSR SHALL be triggered immediately
- **AND** future movement SHALL require a PSR for each hex moved

### Requirement: PSR Trigger — Gyro Damage

The system SHALL trigger a PSR when a gyro is critically hit.

#### Scenario: Gyro critical hit triggers PSR

- **WHEN** a gyro component receives a critical hit
- **THEN** a PSR SHALL be triggered immediately
- **AND** all future PSRs SHALL include a +3 modifier per gyro hit

### Requirement: PSR Trigger — Leg Actuator Damage

The system SHALL trigger a PSR when any leg actuator (upper leg, lower leg, foot) is critically hit.

#### Scenario: Lower leg actuator critical hit

- **WHEN** a lower leg actuator receives a critical hit
- **THEN** a PSR SHALL be triggered immediately

### Requirement: PSR Trigger — Physical Attack Hit

The system SHALL trigger a PSR when a unit is hit by a kick, charge, DFA, or push.

#### Scenario: Unit kicked

- **WHEN** a unit is successfully hit by a kick attack
- **THEN** the target unit SHALL make a PSR to avoid falling

#### Scenario: Unit charged

- **WHEN** a unit is successfully hit by a charge attack
- **THEN** both the target and attacker SHALL make PSRs to avoid falling

#### Scenario: Unit hit by DFA

- **WHEN** a unit is successfully hit by a death from above (DFA) attack
- **THEN** the target unit SHALL make a PSR to avoid falling

#### Scenario: Unit pushed

- **WHEN** a unit is successfully pushed
- **THEN** the target unit SHALL make a PSR to avoid falling

### Requirement: PSR Trigger — Physical Attack Miss

The system SHALL trigger a PSR for the attacker when certain physical attacks miss.

#### Scenario: Kick miss

- **WHEN** a kick attack misses
- **THEN** the attacker SHALL make a PSR to avoid falling

#### Scenario: DFA miss

- **WHEN** a DFA attack misses
- **THEN** the attacker SHALL make a PSR with a +4 modifier to avoid falling
- **AND** if the attacker falls, they SHALL take falling damage as normal

#### Scenario: Charge miss

- **WHEN** a charge attack misses
- **THEN** the attacker SHALL make a PSR to avoid falling

### Requirement: PSR Trigger — Terrain

The system SHALL trigger PSRs when entering difficult terrain.

#### Scenario: Entering rubble terrain

- **WHEN** a unit enters a rubble hex
- **THEN** a PSR SHALL be triggered

#### Scenario: Running through rough terrain

- **WHEN** a unit runs through rough terrain
- **THEN** a PSR SHALL be triggered

#### Scenario: Moving on ice

- **WHEN** a unit moves on ice terrain
- **THEN** a PSR SHALL be triggered to avoid breaking through

#### Scenario: Entering or exiting water

- **WHEN** a unit enters or exits a water hex (depth 1+)
- **THEN** a PSR SHALL be triggered

### Requirement: PSR Trigger — Skidding

The system SHALL trigger a PSR when skidding conditions occur.

#### Scenario: Skidding on pavement or ice

- **WHEN** a unit attempts to change facing on pavement or ice at running speed
- **THEN** a PSR SHALL be triggered to avoid skidding

### Requirement: PSR Trigger — Movement with Damage

The system SHALL trigger PSRs during movement with damaged components.

#### Scenario: Running with damaged hip

- **WHEN** a unit with a damaged hip actuator attempts to run
- **THEN** a PSR SHALL be required for each hex of movement

#### Scenario: Running with damaged gyro

- **WHEN** a unit with gyro damage attempts to run
- **THEN** a PSR SHALL be required with the +3 per gyro hit modifier

### Requirement: PSR Trigger — Collapse and Failure

The system SHALL trigger PSRs for building/bridge collapse and equipment failure scenarios.

#### Scenario: Building collapse under unit

- **WHEN** a building collapses while a unit is standing on it
- **THEN** a PSR SHALL be triggered

#### Scenario: MASC failure

- **WHEN** MASC fails during a turn
- **THEN** a PSR SHALL be triggered

#### Scenario: Supercharger failure

- **WHEN** a supercharger fails during a turn
- **THEN** a PSR SHALL be triggered

### Requirement: PSR Trigger — Shutdown and Startup

The system SHALL trigger a PSR when a unit shuts down.

#### Scenario: Shutdown triggers PSR

- **WHEN** a unit shuts down (voluntarily or from heat)
- **THEN** a PSR SHALL be triggered with target number 3
- **AND** failure SHALL cause the unit to fall

### Requirement: PSR Trigger — Standing Up

The system SHALL trigger or project the stand-up PSR outcome required by the
represented stand-up rules. If the stand-up target is impossible, the PSR SHALL
resolve as an automatic failure instead of rolling dice.

#### Scenario: Playtest3 heavy-duty gyro stand-up uses hit-count modifier

- **GIVEN** `playtest_3` is enabled
- **AND** a prone Mek has a represented heavy-duty gyro
- **WHEN** the stand-up attempt is projected or committed
- **THEN** one, two, and three represented heavy-duty gyro hits SHALL contribute
  +1, +2, and +3 respectively to the stand-up PSR modifier
- **AND** three heavy-duty gyro hits SHALL still use a finite stand-up target
  under Playtest3.

#### Scenario: Playtest3 heavy-duty gyro destroyed threshold remains automatic failure

- **GIVEN** `playtest_3` is enabled
- **AND** a prone Mek has a represented heavy-duty gyro with four gyro hits
- **WHEN** the stand-up attempt is committed
- **THEN** the stand-up PSR SHALL resolve with an impossible target
- **AND** the roll SHALL be recorded as 0 without invoking the dice roller
- **AND** the reason SHALL be `Cannot stand with a destroyed gyro`
- **AND** the unit SHALL remain prone

#### Scenario: Heavy-duty gyro two-hit stand-up uses represented modifier

- **GIVEN** a prone Mek has a represented heavy-duty gyro with two gyro hits
- **WHEN** the stand-up attempt is projected or committed
- **THEN** the stand-up PSR SHALL use a finite target number
- **AND** the target modifiers SHALL include the represented heavy-duty gyro
  damage modifier
- **AND** a successful dice result SHALL stand the unit instead of resolving as
  an automatic failure

#### Scenario: Heavy-duty gyro destroyed threshold remains automatic failure

- **GIVEN** a prone Mek has a represented heavy-duty gyro with three gyro hits
- **WHEN** the stand-up attempt is committed
- **THEN** the stand-up PSR SHALL resolve with an impossible target
- **AND** the roll SHALL be recorded as 0 without invoking the dice roller
- **AND** the reason SHALL be `Cannot stand with a destroyed gyro`
- **AND** the unit SHALL remain prone

### Requirement: PSR Modifier — Gyro Damage

AirMek landing PSRs SHALL use the landing-control modifier already computed
from MegaMek `LandAirMek.checkAirMekLanding()` semantics instead of applying
the generic gyro PSR modifier. Pilot wound modifiers SHALL still apply through
the normal PSR resolver.

#### Scenario: AirMek landing PSR avoids generic gyro double-counting

- **GIVEN** an AirMek landing PSR has a landing-control modifier
- **AND** the unit state also has represented gyro damage
- **WHEN** the PSR is resolved
- **THEN** the target number SHALL include the landing-control modifier
- **AND** it SHALL NOT include the generic gyro-hit PSR modifier.

### Requirement: PSR Modifier — Pilot Wounds

Each pilot wound SHALL add +1 to all PSR target numbers.

#### Scenario: Wounded pilot PSR modifier

- **WHEN** a pilot with 2 wounds makes a PSR
- **THEN** the PSR target number SHALL include a +2 modifier (1 per wound)

### Requirement: PSR Modifier — Leg Actuator Damage

AirMek landing PSRs SHALL use the landing-control modifier already computed
from MegaMek `LandAirMek.checkAirMekLanding()` semantics instead of applying
generic leg-actuator PSR modifiers.

#### Scenario: AirMek landing PSR avoids generic actuator double-counting

- **GIVEN** an AirMek landing PSR has a landing-control modifier
- **AND** the unit state also has represented leg-actuator damage
- **WHEN** the PSR is resolved
- **THEN** the target number SHALL include the landing-control modifier
- **AND** it SHALL NOT include generic actuator PSR modifiers.

### Requirement: PSR Modifier — Terrain

Terrain conditions SHALL add modifiers to PSRs.

#### Scenario: Rough terrain PSR modifier

- **WHEN** making a PSR triggered by rough terrain while running
- **THEN** the terrain PSR modifier SHALL be applied

### Requirement: PSR Queue — First Failure Clears Remaining

When multiple PSRs are queued in a single phase, the first failure SHALL cause a fall and clear all remaining PSRs.

#### Scenario: Multiple PSRs with first failure

- **WHEN** a unit has 3 PSRs queued (20+ damage, leg damage, gyro hit)
- **THEN** the PSRs SHALL be resolved in order
- **AND** if the first PSR fails, the unit SHALL fall
- **AND** the remaining 2 PSRs SHALL be cleared without rolling

#### Scenario: All PSRs succeed

- **WHEN** a unit has 2 PSRs queued and both rolls succeed
- **THEN** the unit SHALL remain standing

### Requirement: Injectable Randomness for PSRs

All PSR resolution SHALL use injectable DiceRoller for deterministic testing.

#### Scenario: Deterministic PSR resolution

- **WHEN** resolving PSRs with a seeded DiceRoller
- **THEN** identical inputs and seeds SHALL produce identical PSR outcomes

### Requirement: Pilot Consciousness Check

When a pilot takes sufficient damage to warrant a consciousness roll, the check SHALL use an inclusive `>=` comparison on the pilot-damage threshold, not the exclusive `>` previously used in `src/utils/gameplay/damage.ts` (~line 461).

This corrects a one-off where a pilot at the exact boundary damage value previously avoided the roll. Per TechManual p.87, the roll fires when damage reaches (not exceeds) the threshold.

#### Scenario: Pilot at threshold triggers consciousness roll

- **GIVEN** a pilot whose accumulated damage has just reached the consciousness threshold
- **WHEN** the consciousness check is evaluated
- **THEN** the check SHALL fire (pilot rolls 2d6 vs consciousness TN)

#### Scenario: Pilot below threshold does not trigger roll

- **GIVEN** a pilot whose accumulated damage is 1 point below the consciousness threshold
- **WHEN** the consciousness check is evaluated
- **THEN** the check SHALL NOT fire

#### Scenario: Pilot above threshold triggers roll

- **GIVEN** a pilot whose accumulated damage is 1 point above the consciousness threshold
- **WHEN** the consciousness check is evaluated
- **THEN** the check SHALL fire

### Requirement: PSR Queue on Unit State

Each unit SHALL maintain a `psrQueue` on its game state. Trigger events SHALL enqueue an `IPsrQueuedEntry` at the moment they fire, and the resolution step SHALL drain the queue per the `resolveAt` policy.

#### Scenario: Damage triggers enqueue

- **GIVEN** a unit taking 22 damage during the weapon phase
- **WHEN** the 20-point boundary is crossed
- **THEN** the unit's `psrQueue` SHALL contain an entry with `triggerId: TwentyPlusPhaseDamage`

#### Scenario: Multiple triggers queue independently

- **GIVEN** a unit that suffers both a gyro crit and heavy damage in the same phase
- **WHEN** both triggers fire
- **THEN** the `psrQueue` SHALL contain both entries
- **AND** the gyro-crit entry SHALL resolve immediately
- **AND** the damage-based entry SHALL resolve at end of phase

### Requirement: PSR Resolution Fires 2d6 vs Pilot + Modifiers

For each queued PSR, the system SHALL roll 2d6 (via seeded RNG) against a target number equal to `pilotingSkill + sum(modifiers)`.

#### Scenario: Successful roll

- **GIVEN** a pilot with skill 4 and gyro-hit counter 1 (modifier +3), facing a 20+ damage trigger (base +0)
- **WHEN** the PSR resolves with roll 8
- **THEN** TN = 4 + 3 + 0 = 7
- **AND** roll 8 ≥ 7 → success
- **AND** a `PsrResolved { success: true, tn: 7, roll: 8 }` event SHALL be emitted

#### Scenario: Failed roll triggers fall

- **GIVEN** a pilot with skill 5 facing TN 7 with roll 6
- **WHEN** the PSR resolves
- **THEN** the PSR SHALL fail
- **AND** `applyFall` SHALL be invoked
- **AND** remaining queued PSRs for this unit this phase SHALL be cleared

### Requirement: PSR Trigger Catalog

The system SHALL implement the canonical PSR trigger set including (but not limited to): `TwentyPlusPhaseDamage`, `LegStructureDamage`, `HipActuatorCrit`, `GyroCrit`, `LegActuatorCrit`, `EngineHit`, `JumpIntoWater`, `Skid`, `MASCFailure`, `SuperchargerFailure`, `AttemptStand`, `PhysicalAttackTarget`, `MissedDFA`, `MissedCharge`, `HeatShutdown`.

`HeadStructureDamage` is intentionally absent from this catalog — canonical Total Warfare treats head hits as a wound + consciousness check (handled by the damage pipeline via `applyPilotDamage` and the consciousness-roll system), not as a stability PSR. The original task in archived `wire-piloting-skill-rolls` (task 2.3) conflated two separate mechanics. Consumers requiring head-breach pilot effects SHALL use `applyPilotDamage` (cluster damage when head front + rear armor is breached) and the existing pilot consciousness-roll path. No replacement PSR factory or queue entry is required.

#### Scenario: Hip actuator crit fires PSR

- **GIVEN** a hip actuator takes a critical hit
- **WHEN** the crit effect is applied
- **THEN** a `HipActuatorCrit` PSR SHALL be queued with `resolveAt: Immediate`

#### Scenario: MASC failure queues PSR

- **GIVEN** a unit uses MASC and the activation roll fails
- **WHEN** the failure is processed
- **THEN** a `MASCFailure` PSR SHALL be queued

#### Scenario: Physical attack hit queues PSR

- **GIVEN** a unit is hit by a kick / charge / DFA / push
- **WHEN** the physical attack resolves
- **THEN** a `PhysicalAttackTarget` PSR SHALL be queued for the target

### Requirement: Gyro Modifier Stacking

Each gyro-hit counter SHALL add +3 to every future PSR's TN until the gyro is destroyed.

#### Scenario: Two gyro hits stack to +6

- **GIVEN** a mech with gyro-hit counter = 2
- **WHEN** a PSR resolves for any trigger
- **THEN** the TN SHALL include +6 from gyro hits

### Requirement: Pilot Wound Modifier

Each pilot-damage point SHALL add +1 to every future PSR's TN.

#### Scenario: Wounded pilot suffers PSR penalty

- **GIVEN** a pilot with 2 wounds
- **WHEN** a PSR resolves
- **THEN** the TN SHALL include +2 from wounds

### Requirement: Pending PSR Queue Cleared At Turn Boundary (Regression Protection)

The `pendingPSRs` queue SHALL be cleared when the game state transitions from the End phase of one turn into the first phase of the next turn. PSRs that have not been resolved by the end of their turn of origin do NOT carry over into subsequent turns.

This behavior is **already implemented** in `src/utils/gameplay/gameState/phaseManagement.ts::applyTurnStarted` (lines 45-72; clear at line 60), citing `wire-piloting-skill-rolls` task 1.3 and TW p.52. The original audit incorrectly flagged `applyPhaseChanged` as the implementation site — the live behavior is correctly attached to `TurnStarted` events, NOT phase transitions (per the archived change's deliberate task-1.3 decision: "PSRs within a turn are deliberately NOT cleared at phase change — they accumulate and resolve in the End phase").

This requirement is therefore **regression-protection-only**: it adds an explicit test scenario that locks in the existing `applyTurnStarted` clear behavior so a future refactor cannot silently drop it. No production code change is required.

#### Scenario: applyTurnStarted clears pending PSRs at turn-N+1 start

- **WHEN** a unit's `pendingPSRs` array contains one or more entries at the moment a `TurnStarted` event arrives for turn N+1
- **AND** `applyTurnStarted(state, event)` runs against that state
- **THEN** every unit in the resulting state has `pendingPSRs: []`
- **AND** the unit's other per-turn flags (`weaponsFiredThisTurn`) are also reset

#### Scenario: applyPhaseChanged within a turn does NOT clear pending PSRs

- **WHEN** a PSR is queued during the Weapon Attack phase of turn N
- **AND** the phase transitions from Weapon Attack to Physical Attack within the same turn (via `applyPhaseChanged`)
- **THEN** `state.pendingPSRs` retains the queued PSR (intended for resolution at turn N's End phase per archived `wire-piloting-skill-rolls` task 1.3 decision)

### Requirement: PSR Trigger Events Emitted Before Resolution

When a unit accumulates a condition requiring a Piloting Skill Roll (≥20 damage in a single turn, actuator hit, gyro hit, leg destruction, fall recovery), the engine SHALL emit `PSRTriggered { unitId, reason, baseTargetNumber, modifiers[] }` in the same turn-phase the trigger occurred. The trigger event MUST emit BEFORE the corresponding `PSRResolved` event. The reason field MUST be one of `'damage_threshold' | 'actuator_hit' | 'gyro_hit' | 'leg_destroyed' | 'fall_recovery'`.

#### Scenario: 20+ damage in one turn triggers PSR

- **GIVEN** an Atlas takes 22 damage from a single attack
- **WHEN** the post-combat PSR phase processes the unit
- **THEN** `PSRTriggered { unitId, reason: 'damage_threshold', baseTargetNumber: <pilot-skill> }` MUST emit
- **AND** `PSRResolved { unitId, rolled, hit: bool }` MUST follow

#### Scenario: Multiple PSR triggers in same turn produce multiple events

- **GIVEN** a unit takes 30 damage AND loses an actuator AND has gyro destroyed in the same turn
- **WHEN** the PSR phase resolves
- **THEN** three `PSRTriggered` events MUST emit (one per reason)
- **AND** the resolution rules apply the worst single PSR (per BT Total Warfare) — only one `PSRResolved` MUST follow with `modifiers[]` aggregating across triggers

### Requirement: PSR Resolution Uses Injected Roller

`resolveAllPSRs()` and any per-PSR resolution helper SHALL accept and use the injected `D6Roller` per the determinism contract in `simulation-system`. The current implementation that uses unseeded `roll2d6()` MUST be updated to thread the roller through.

#### Scenario: Two seeded runs produce identical PSR outcomes

- **GIVEN** two seeded `SeededD6Roller` instances with seed `42`
- **AND** identical Atlas state with pending PSR for damage threshold
- **WHEN** PSR resolution runs against each roller
- **THEN** both MUST produce byte-identical `PSRResolved` events (same rolled value, same hit/miss outcome)

### Requirement: Fall Sequence Emits Full Event Chain

When a PSR fails and the unit falls, the engine SHALL emit `UnitFell { unitId, fromHex, toFacing }` followed by any cascading events (`PilotHit` if pilot takes damage from fall, `PSRTriggered { reason: 'fall_recovery' }` for next turn's recovery PSR). The current implementation emits `UnitFell` but does NOT emit follow-on events.

#### Scenario: Pilot takes damage from fall

- **GIVEN** a unit fails a PSR and falls
- **AND** the fall damage rules indicate the pilot takes 1 wound
- **WHEN** the fall resolves
- **THEN** `UnitFell` MUST emit
- **AND** `PilotHit { unitId, wounds: 1, source: 'fall' }` MUST follow
- **AND** `PSRTriggered { reason: 'fall_recovery' }` MUST emit at the start of the unit's next turn

### Requirement: Pending PSR State Carries Through Phase Transitions

The `IUnitGameState.pendingPSRs[]` queue (referenced in `combat-resolution` Tier-5 work) MUST persist across all combat phases within the same turn — damage in weapon attack phase queues a PSR, damage in physical attack phase queues another, the post-combat PSR phase resolves all queued PSRs in one batch. The queue MUST clear at turn boundary (start of next turn) per the existing post-archive contract.

#### Scenario: PSRs queued in both attack phases resolve in one batch

- **GIVEN** a unit takes 12 damage in weapon attack phase (no PSR yet)
- **AND** takes 10 damage in physical attack phase (now 22 cumulative — triggers PSR)
- **WHEN** the post-combat PSR phase runs
- **THEN** `PSRTriggered { reason: 'damage_threshold' }` MUST emit once
- **AND** the trigger's `damage` modifier MUST account for the cumulative 22 damage

#### Scenario: Pending PSRs clear at turn boundary

- **GIVEN** a unit with a pending PSR that resolved successfully (no fall)
- **WHEN** the next turn's start phase begins
- **THEN** the unit's `pendingPSRs[]` queue MUST be empty

### Requirement: PSRTriggered Carries Base Piloting Skill

Every `psr_triggered` event SHALL include the unit's `basePilotingSkill` (the unmodified piloting skill value before per-trigger and cumulative modifiers) in its payload. Consumers SHALL use this field to render the full PSR target-number arithmetic (`basePilotingSkill + additionalModifier + cumulative-mods = targetNumber`) without separately joining to the unit's pilot record.

The `basePilotingSkill` field is OPTIONAL on the payload to preserve compatibility with NDJSON event streams written before this change.

#### Scenario: PSR-triggered event carries base piloting skill from the unit

- **GIVEN** a unit with `pilot.piloting: 4`
- **AND** the runner triggers a PSR with `additionalModifier: 2` for reason `'gyro-hit'`
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `basePilotingSkill: 4`
- **AND** the event payload SHALL have `additionalModifier: 2`

#### Scenario: Legacy event streams without basePilotingSkill replay

- **GIVEN** an NDJSON event log written before this change (no `basePilotingSkill` on `psr_triggered` events)
- **WHEN** consumers process the events
- **THEN** processing SHALL succeed
- **AND** consumers MAY render the missing field as `'-'` or fall back to a separate unit-record lookup

### Requirement: UnitFell Carries Location and Reason

Every `unit_fell` event SHALL include the location at which the fall happened and a free-string `reason` describing the fall cause. Both fields are OPTIONAL on `IUnitFellPayload` for back-compat. The `reason` field is typed as `string` in this change; PR E (`structure-psr-reason-as-discriminated-code`) tightens it to a `PSRReasonCode` discriminated union.

The `location` field SHALL be populated from the runner's PSR resolution context (the hex coordinate or unit-internal location associated with the trigger) — for example `'left_leg'` when leg-damage caused the fall, `'center_torso'` for damage-PSR falls, or the hex-coordinate string when the fall was triggered by terrain.

#### Scenario: Damage-induced fall carries the structure location

- **GIVEN** a unit takes 20+ damage in a phase, triggering a damage-PSR
- **AND** the PSR fails, causing the unit to fall
- **WHEN** the `unit_fell` event is emitted
- **THEN** the event payload SHALL have a populated `location` (e.g. `'center_torso'` referencing the damaged location)
- **AND** the event payload SHALL have a populated `reason` (e.g. `'took-20-damage'`)

#### Scenario: Gyro-hit-induced fall carries the gyro location

- **GIVEN** a critical hit destroys a gyro slot
- **AND** the resulting PSR fails, causing the unit to fall
- **WHEN** the `unit_fell` event is emitted
- **THEN** the event payload SHALL have `location` populated with the gyro-bearing location (typically `'center_torso'` for standard mechs)
- **AND** the event payload SHALL have `reason` populated with a string identifying the gyro cause (e.g. `'gyro-hit'`)

### Requirement: Movement-Step PSR Trigger-Source Stamping

When the simulation runner triggers a `psr_triggered` event during the resolution of a movement step (skid on ice, leaping leg damage on elevation drop, jump landing on rough terrain, AttemptStand from a `'standUp'` step, swarm-dislodge from a `'shakeOffSwarm'` step, etc.), the runner SHALL populate `IPSRTriggeredPayload.triggerSource` with the string `'movement-step:<index>'` where `<index>` is the 0-based ordinal of the step in the corresponding `movement_declared.payload.steps` array.

This contract lets consumers correlate per-step PSR events back to the originating step without joining on hex coordinate or timing alone. The `triggerSource` field is REQUIRED on `IPSRTriggeredPayload` (already in the type), so this requirement narrows the value space for movement-induced PSRs without adding a new field.

For PSRs that fire OUTSIDE of movement-step resolution (damage-induced, heat-induced, recovery-induced), `triggerSource` SHALL retain its existing free-string semantics — for example `'damage-20-threshold'`, `'heat-26'`, `'gyro-destroyed'`, `'cockpit-recovery'`. PR E (`structure-psr-reason-as-discriminated-code`) tightens these into a discriminated `PSRReasonCode` union; this requirement does NOT depend on PR E.

#### Scenario: Skid PSR fired during a forward step references that step

- **GIVEN** a unit running across an ice hex at step index 2 of its movement chain
- **AND** the runner triggers a Skid PSR
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `triggerSource: 'movement-step:2'`
- **AND** the corresponding `movement_declared.payload.steps[2]` SHALL be a `'forward'` step entering an ice hex

#### Scenario: AttemptStand PSR from a stand-up step references the stand-up step's index

- **GIVEN** a prone unit whose movement chain begins with a `'standUp'` step at index 0
- **AND** the runner triggers an AttemptStand PSR (always fires for stand-up)
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `triggerSource: 'movement-step:0'`

#### Scenario: Damage-induced PSR retains its original trigger-source string

- **GIVEN** a unit takes 21+ damage in a phase, triggering a damage-PSR via the existing damage-threshold check
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL NOT have `triggerSource` starting with `'movement-step:'`
- **AND** the event payload's `triggerSource` SHALL retain its existing free-string value (e.g. `'damage-20-threshold'`)

### Requirement: PSR Reason Code Discriminated Field

`IPSRTriggeredPayload`, `IPSRResolvedPayload`, and `IUnitFellPayload` SHALL carry a `reasonCode?: PSRTrigger` field discriminated against the canonical 27-value `PSRTrigger` enum at `src/utils/gameplay/pilotingSkillRolls/types.ts`. The field is OPTIONAL on every payload to preserve back-compat with NDJSON event streams written before this contract.

The free-string `reason` field on the same payloads SHALL be RETAINED unchanged for display continuity. Display consumers (`EventLogDisplay`, the Python `format-event-log.py`) read `reason` to render human-readable text. Filter / aggregate consumers (`EventLogQuery`, `MetricsCollector`, scenario tests) read `reasonCode` for machine-readable filtering.

The 27 canonical codes (cross-referenced against MegaMek's `Server.processPilotingRolls` and `MovePathHandler.checkSkid` taxonomy):

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
| `kick_miss` | movement | Attacker missed a kick (self-PSR) |
| `charge_miss` | movement | Attacker missed a charge (self-PSR) |
| `dfa_miss` | movement | Attacker missed a DFA (self-PSR) |
| `entering_rubble` | movement | Unit entered rubble terrain |
| `running_rough_terrain` | movement | Unit ran through rough terrain |
| `moving_on_ice` | movement | Unit moved on an ice hex |
| `entering_water` | movement | Unit entered a water hex |
| `exiting_water` | movement | Unit exited a water hex |
| `skidding` | movement | Skid PSR triggered by unstable ground |
| `running_damaged_hip` | movement | Unit ran with a damaged hip |
| `running_damaged_gyro` | movement | Unit ran with a damaged gyro |
| `building_collapse` | movement | Building under unit's footprint collapsed |
| `masc_failure` | movement | MASC system failed during attempted run |
| `supercharger_failure` | movement | Supercharger failed during attempted run |
| `heat_shutdown` | heat | Heat-induced shutdown PSR |
| `standing_up` | recovery | Prone unit attempting to stand |

The runner SHALL populate `reasonCode` at the PSR factory boundary — every factory in `src/utils/gameplay/pilotingSkillRolls/{combat,damage,environment,system,phaseChecks}Factories.ts` SHALL emit both `reason` (human string, unchanged) AND `reasonCode` (the matching `PSRTrigger` enum value) in the same `IPSRTriggeredPayload` returned to callers.

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

### Requirement: PSR Reason Category Bucket Helper

`src/utils/gameplay/pilotingSkillRolls/types.ts` SHALL export a `PSRReasonCategory` string-literal union and a `getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory` helper:

```ts
export type PSRReasonCategory = 'movement' | 'damage' | 'heat' | 'recovery';

export function getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory;
```

The function SHALL deterministically map every `PSRTrigger` value to exactly one of the four categories per the table in `Requirement: PSR Reason Code Discriminated Field`. The helper enables consumers (the readable formatter, metrics aggregators) to bucket PSRs without enumerating all 27 codes.

#### Scenario: Recovery-PSR (StandingUp) lands in recovery bucket

- **GIVEN** a prone unit attempts to stand, triggering `createStandUpAttempt(unit)`
- **WHEN** the factory returns a `IPSRTriggeredPayload`
- **THEN** the payload SHALL have `reasonCode: PSRTrigger.StandingUp`
- **AND** `getPSRReasonCategory(payload.reasonCode)` SHALL equal `'recovery'`

#### Scenario: Heat-shutdown PSR lands in heat bucket

- **GIVEN** a unit at heat ≥14 triggers `createReactorShutdownPSR(unit)`
- **WHEN** the factory returns a `IPSRTriggeredPayload`
- **THEN** the payload SHALL have `reasonCode: PSRTrigger.Shutdown`
- **AND** `getPSRReasonCategory(payload.reasonCode)` SHALL equal `'heat'`

#### Scenario: getPSRReasonCategory is deterministic over all 27 codes

- **GIVEN** the full set of `PSRTrigger` enum values (27 codes)
- **WHEN** `getPSRReasonCategory` is called for each
- **THEN** every code SHALL map to exactly one of `'movement' | 'damage' | 'heat' | 'recovery'`
- **AND** the partition SHALL match the category column in the spec's 27-code table

### Requirement: AirMek Landing PSR Trigger

The PSR taxonomy SHALL include a canonical `PSRTrigger.AirMekLanding` code for
LAM AirMek landing control checks, and the AirMek landing PSR factory SHALL
populate both the human-readable reason and the canonical reason code.

#### Scenario: AirMek landing factory stamps canonical reason code

- **WHEN** an AirMek landing PSR is created
- **THEN** the pending PSR SHALL use reason `landing with gyro or leg damage`
- **AND** it SHALL use `triggerSource: PSRTrigger.AirMekLanding`
- **AND** it SHALL use `reasonCode: PSRTrigger.AirMekLanding`.

