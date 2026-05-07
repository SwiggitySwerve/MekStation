# Add PSRReasonCode discriminated field to PSR / fall events

## Why

`IPSRTriggeredPayload.reason`, `IPSRResolvedPayload.reason`, and `IUnitFellPayload.reason` are typed as plain `string` today. The 9 PSR factory modules (`combatFactories`, `damageFactories`, `environmentFactories`, `systemFactories`, `phaseChecks`) emit human-readable strings like `'Kicked'`, `'20+ damage this phase'`, `'Hit by DFA'`. The Python readable formatter and the UI EventLogDisplay component consume these strings AS-IS for display.

Meanwhile, `src/utils/gameplay/pilotingSkillRolls/types.ts:52` defines a comprehensive `PSRTrigger` enum with **27 canonical snake_case codes** (`'kicked'`, `'20+_damage'`, `'dfa_target'`, `'gyro_hit'`, `'standing_up'`, `'moving_on_ice'`, etc.). MegaMek's reference implementation enumerates the same trigger taxonomy at `E:/Projects/megamek/megamek/src/megamek/server/totalwarfare/MovePathHandler.java` and `Server.processPilotingRolls`. Consumers that want to filter or aggregate ("show me all gyro-induced PSRs across this match") have no machine-readable handle — they'd have to string-match on display strings, which fork between scenarios and language localizations.

## What

### Type extension — add `reasonCode` sibling field (do NOT replace `reason`)

Add `readonly reasonCode?: PSRTrigger` to:
- `IPSRTriggeredPayload` (`src/types/gameplay/GameSessionInterfaces.ts:849`)
- `IPSRResolvedPayload` (line 856)
- `IUnitFellPayload` (line 870)

`reason: string` stays as-is for display continuity. Consumers that want filtering use `reasonCode`; consumers that want display use `reason`. Both populate from the same factory at emission.

### Factory migration — populate `reasonCode` alongside `reason`

Update every PSR factory in `src/utils/gameplay/pilotingSkillRolls/{combat,damage,environment,system,phaseChecks}Factories.ts` to populate `reasonCode` with the matching `PSRTrigger.X` enum value alongside the existing human-readable `reason`. Every factory already references its `PSRTrigger` (the existing `triggerSource` field) — this is a 1-line addition per factory.

### `reasonCategory` bucket helper

Add `getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory` at `src/utils/gameplay/pilotingSkillRolls/types.ts` where `PSRReasonCategory = 'movement' | 'damage' | 'heat' | 'recovery'`. This bucket lets consumers group PSRs without enumerating all 27 codes — for example, the readable formatter can color movement-induced PSRs differently from damage-induced ones, and metrics aggregators can roll up "total movement-PSRs / damage-PSRs / heat-PSRs / recovery-PSRs per match."

The category mapping (cross-referenced against MegaMek's groupings):

| Category | Codes |
|---|---|
| `movement` | `kicked`, `charged`, `dfa_target`, `pushed`, `kick_miss`, `charge_miss`, `dfa_miss`, `entering_rubble`, `running_rough_terrain`, `moving_on_ice`, `entering_water`, `exiting_water`, `skidding`, `running_damaged_hip`, `running_damaged_gyro`, `building_collapse`, `masc_failure`, `supercharger_failure` |
| `damage` | `20+_damage`, `leg_damage`, `hip_actuator_destroyed`, `gyro_hit`, `engine_hit`, `upper_leg_actuator_hit`, `lower_leg_actuator_hit`, `foot_actuator_hit` |
| `heat` | `heat_shutdown` |
| `recovery` | `standing_up` |

### Spec extension

`piloting-skill-rolls`: ADD `Requirement: PSR Reason Code Discriminated Field` (the type contract + 27-code enumeration + factory population invariant + `reasonCategory` bucket helper).

## Impact

- **Affected types**: 3 payload interfaces (`IPSRTriggeredPayload`, `IPSRResolvedPayload`, `IUnitFellPayload`).
- **Affected code**: 9 PSR factory modules + new `getPSRReasonCategory` helper.
- **Affected specs**: `piloting-skill-rolls`.
- **Risk**: low. `reasonCode` is OPTIONAL on every payload (back-compat for legacy NDJSON streams). `reason: string` is unchanged so display layers don't break. Factory migrations are mechanical 1-line additions.
- **Visible improvement**: the readable formatter and EventLogQuery can filter PSRs by canonical code (`query.ofType(PSRTriggered).whereReasonCode(...)`) and bucket-aggregate by category. The 27-code taxonomy also makes the PSR system self-documenting.

## Out of scope

- Breaking the `reason: string` type (that would force display-layer changes; deferred).
- New PSR triggers not yet in the enum (`add-cumulative-crew-damage-thresholds` follow-on adds heat-25/32/39/47 thresholds with their PSR triggers).
- Movement-step trigger-source stamping (already shipped in PR C).
- UI EventLogDisplay component changes (separate concern; this PR ships only the substrate).
