# Tasks

## 1. Authoring

- [x] 1.1 Author proposal.md (motivation, sibling-field strategy, 27-code MegaMek cross-reference)
- [x] 1.2 Author piloting-skill-rolls spec delta (PSR Reason Code Discriminated Field + PSR Reason Category Bucket Helper — 7 scenarios)

## 2. Type extensions (`src/types/gameplay/GameSessionInterfaces.ts`)

- [x] 2.1 Add `readonly reasonCode?: PSRTrigger` to `IPSRTriggeredPayload`
- [x] 2.2 Add `readonly reasonCode?: PSRTrigger` to `IPSRResolvedPayload`
- [x] 2.3 Add `readonly reasonCode?: PSRTrigger` to `IUnitFellPayload`
- [x] 2.4 Move `PSRTrigger` enum to `src/types/gameplay/PSRTriggerCodes.ts` (back-compat re-export from `pilotingSkillRolls/types.ts`); cycle resolved. Also added `reasonCode?` to `IPendingPSR` so factories thread it through unchanged callsite signatures.

## 3. Bucket helper (`src/utils/gameplay/pilotingSkillRolls/types.ts`)

- [x] 3.1 Added `export type PSRReasonCategory = 'movement' | 'damage' | 'heat' | 'recovery'`
- [x] 3.2 Added `export function getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory` with exhaustive switch + `never` exhaustiveness check
- [x] 3.3 Added unit test at `src/utils/gameplay/pilotingSkillRolls/__tests__/getPSRReasonCategory.test.ts` — 38 tests, exhaustive over all enum values + spot checks + per-bucket coverage

## 4. Factory migration

- [x] 4.1 `combatFactories.ts` — 7 factories migrated (Kicked, Charged, DFATarget, Pushed, KickMiss, ChargeMiss, DFAMiss)
- [x] 4.2 `damageFactories.ts` — 8 factories migrated (PhaseDamage20Plus, LegDamage, HipActuatorDestroyed, GyroHit, EngineHit, UpperLegActuatorHit, LowerLegActuatorHit, FootActuatorHit)
- [x] 4.3 `environmentFactories.ts` — 9 factories migrated (Shutdown, StandingUp, EnteringRubble, RunningRoughTerrain, MovingOnIce, EnteringWater, ExitingWater, Skidding, BuildingCollapse) preserving the optional `stepIndex` parameter from PR C
- [x] 4.4 `systemFactories.ts` — 4 factories migrated (RunningDamagedHip, RunningDamagedGyro, MASCFailure, SuperchargerFailure)
- [x] 4.5 `phaseChecks.ts` (`createStandUpAttempt`) covered transitively — calls `createStandingUpPSR` which now stamps `reasonCode`
- [x] 4.6 Direct event-builder callers also threaded `reasonCode`: `gameSessionAttackResolution.ts` (leg-damage + 20+damage), `gameSessionHeat.ts` (shutdown ×2), `gameSessionPhysical.ts` (target / hit / miss with attack-type → enum mapping), `criticalHitResolution/{actuator,engine}Effects.ts` (gyro + leg-actuator crits), `simulation/runner/phases/{weaponAttack,postCombat,physicalAttack}.ts`

## 5. Tests

- [x] 5.1 Added `__tests__/factoryReasonCode.test.ts` — 26 tests covering all 5 factory families + step-index preservation invariant
- [x] 5.2 Extended `atlasMirrorEventChain.integration.test.ts` with a PR-E scenario test asserting `every` emitted PSR / fall event carries a defined `reasonCode`
- [x] 5.3 Full piloting-skill-rolls test suite green
- [x] 5.4 Combat-fidelity scenario tests green — 1178/1178 simulation tests pass

## 6. Verification

- [x] 6.1 `npx tsc --noEmit --skipLibCheck` clean
- [x] 6.2 `npm run lint` clean (0 errors)
- [x] 6.3 `npm test` (scoped to pilotingSkillRolls + atlasMirror + combat-fidelity + getPSRReasonCategory + factoryReasonCode) — 229/229 green
- [x] 6.4 `npx openspec validate structure-psr-reason-as-discriminated-code --strict` clean

## 7. PR

- [ ] 7.1 Commit on branch `event-log/pr-e-psr-reason-enum`
- [ ] 7.2 Open PR against `main` with title `feat(event-log): add PSRReasonCode discriminated field + 4-bucket category helper`
- [ ] 7.3 Wait for CI green
- [ ] 7.4 Merge with `--squash --delete-branch`

## 8. Archive

- [ ] 8.1 After merge, run `npx openspec archive structure-psr-reason-as-discriminated-code --yes` — clean
- [ ] 8.2 Open archive PR; merge

## 9. Plan closure

- [ ] 9.1 After PR E archive merges: update MEMORY.md with a new entry summarizing the 5-PR event-log line-format series
- [ ] 9.2 Smoke-run the swarm with the latest formatter; confirm the readable companion shows full envelope side / movement chain / 4-digit hex / PSR code on every line
- [ ] 9.3 List the 4 named follow-on changes for the next session: add-mid-move-terrain-damage-events, add-skid-and-displacement-events, add-cumulative-crew-damage-thresholds, add-multi-variant-gyro-cascade
