## ADDED Requirements

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
