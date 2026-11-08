## MODIFIED Requirements

### Requirement: PSR Reason Code Discriminated Field

`IPSRTriggeredPayload`, `IPSRResolvedPayload`, and `IUnitFellPayload` SHALL carry a `reasonCode?: PSRTrigger` field discriminated against the canonical 35-value `PSRTrigger` enum at `src/types/gameplay/PSRTriggerCodes.ts` (re-exported by `src/utils/gameplay/pilotingSkillRolls/types.ts`). The field is OPTIONAL on every payload to preserve back-compat with NDJSON event streams written before this contract.

The free-string `reason` field on the same payloads SHALL be RETAINED unchanged for display continuity. Display consumers (`EventLogDisplay`, the Python `format-event-log.py`) read `reason` to render human-readable text. Filter / aggregate consumers (`EventLogQuery`, `MetricsCollector`, scenario tests) read `reasonCode` for machine-readable filtering.

The 35 canonical codes (cross-referenced against MegaMek's `Server.processPilotingRolls` and `MovePathHandler.checkSkid` taxonomy):

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
| `swamp_unstuck` | recovery | Stuck unit attempting to break free of swamp at movement start |
| `airmek_landing` | movement | AirMek landing-control PSR triggered |
| `running_damaged_hip` | movement | Unit ran with a damaged hip |
| `running_damaged_gyro` | movement | Unit ran with a damaged gyro |
| `controlled_sideslip` | movement | Controlled lateral movement required a PSR |
| `flanking_and_turning` | movement | Running or sprinting unit turned after moving more than one hex |
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

### Requirement: PSR Reason Category Bucket Helper

`src/utils/gameplay/pilotingSkillRolls/types.ts` SHALL export a `PSRReasonCategory` string-literal union and a `getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory` helper:

```ts
export type PSRReasonCategory = 'movement' | 'damage' | 'heat' | 'recovery';

export function getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory;
```

The function SHALL deterministically map every `PSRTrigger` value to exactly one of the four categories per the table in `Requirement: PSR Reason Code Discriminated Field`. The helper enables consumers (the readable formatter, metrics aggregators) to bucket PSRs without enumerating all 35 codes.

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

#### Scenario: getPSRReasonCategory is deterministic over all 35 codes

- **GIVEN** the full set of `PSRTrigger` enum values (35 codes)
- **WHEN** `getPSRReasonCategory` is called for each
- **THEN** every code SHALL map to exactly one of `'movement' | 'damage' | 'heat' | 'recovery'`
- **AND** the partition SHALL match the category column in the spec's 35-code table

## ADDED Requirements

### Requirement: Swamp Unstuck Replay Shape

The combat physical replay schema pack SHALL accept `swamp_unstuck` as a `reasonCode` on `PSRTriggered`, `PSRResolved`, `UnitFell`, and `UnitStuck`, and SHALL accept an optional boolean `canUnstickByJumping` on `UnitStuck`. These are in-place widenings of baseline v1 with no upcast transition: every earlier payload SHALL parse unchanged. The four widened variants SHALL register the schema id `combat.<type>.v1.swamp-unstuck-1`, so a checkpoint fingerprinted before the widening is incompatible for any history holding one of them, while histories holding only the other physical variants keep their fingerprint. Writers SHALL include `canUnstickByJumping` only when it is true.

#### Scenario: Legacy stuck payload replays unchanged

- **GIVEN** a stored `UnitStuck` payload with no `canUnstickByJumping`
- **WHEN** replay validates it at baseline v1
- **THEN** the payload SHALL parse byte-identically
- **AND** it SHALL gain no `canUnstickByJumping` key

#### Scenario: Ill-typed eligibility fails closed

- **GIVEN** a stored `UnitStuck` payload whose `canUnstickByJumping` is not a boolean
- **WHEN** replay validates it
- **THEN** replay SHALL reject it as an invalid payload

#### Scenario: Checkpoint fingerprinted before the widening

- **GIVEN** a checkpoint whose schema-pipeline fingerprint was computed from the pre-widening `combat.<type>.v1` ids
- **WHEN** its history holds a `PSRTriggered`, `PSRResolved`, `UnitFell`, or `UnitStuck` event
- **THEN** checkpoint compatibility SHALL report a `schemaPipelineFingerprint` mismatch
- **AND** recovery SHALL rebuild from an earlier compatible base or full replay
