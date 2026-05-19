# Tasks: Add AI Advanced Systems

## 1. Advanced Tier Parameters

- [ ] 1.1 Add `IAITierAdvancedParameters` (`advancedSystems`, `jumpTacticsWeight`, `ecmAvoidanceWeight`, `ecmCoverageWeight`, `visionWeight`) and an optional `advanced` block on `IAITierParameters` in `src/simulation/ai/AITierRegistry.ts`
- [ ] 1.2 Populate the `advanced` block per tier — `Green`/`Regular`/`Veteran` fully inert (`advancedSystems: false`, zeroed weights); `Elite` populated
- [ ] 1.3 Tests: every tier resolves an `advanced` block; lower tiers keep the flat-roll jump behavior and ignore ECM/vision

## 2. Jump-Jet Tactics

- [ ] 2.1 Create `src/simulation/ai/AIJumpTactics.ts` with `evaluateJump(unit, grid, capability, enemies)` returning `IJumpEvaluation`
- [ ] 2.2 Score a jump destination for terrain-clearing (jump ignores intervening terrain cost), elevation gain, and charge/melee escape
- [ ] 2.3 Weigh jump heat through A2's `AIHeatPlanner.projectHeat`; flag `heatUnsafe` when a jump pushes a shutdown inside the lookahead window
- [ ] 2.4 In `BotPlayer.selectMovementType`, when `advancedSystems` is enabled, choose Jump only when the best jump score clears the tactical threshold; otherwise keep the flat 20% roll
- [ ] 2.5 Tests: a jump over heavy terrain scores high; a heat-unsafe jump is flagged; a charge-escape jump is taken; a lower tier keeps the flat roll

## 3. ECM Awareness

- [ ] 3.1 Create `src/simulation/ai/AIElectronicWarfareAdvisor.ts` consuming `src/utils/gameplay/electronicWarfare/` without modifying it
- [ ] 3.2 Compute a `hostileBubblePenalty` for a destination inside a hostile ECM bubble (`isInECMBubble` against `getEnemyECMSources`)
- [ ] 3.3 Compute a `coverageBonus` for an ECM/probe carrier whose destination covers more lancemates or counters an enemy ECM source
- [ ] 3.4 Tests: a hex inside hostile ECM is penalized; an ECM carrier covering the lance is rewarded; the `electronicWarfare` module is unmodified

## 4. Spotting and Vision Awareness

- [ ] 4.1 Create `src/simulation/ai/AIVisionAdvisor.ts` consuming `src/lib/multiplayer/server/fogOfWar.ts` without modifying it
- [ ] 4.2 Compute a `scoutBonus` for a destination that newly spots a previously-unspotted enemy
- [ ] 4.3 Compute a `losBreakBonus` for a destination that breaks an enemy's spotting line to the moving unit
- [ ] 4.4 Tests: a destination that scouts an unspotted enemy is rewarded; an LOS-breaking destination is rewarded; `fogOfWar.ts` is unmodified

## 5. Advanced Move Scoring

- [ ] 5.1 In `scoreMove`, add the jump-tactics term (jump moves only), the ECM advice term (`coverageBonus - hostileBubblePenalty`), and the vision advice term (`scoutBonus + losBreakBonus`), each multiplied by its tier weight
- [ ] 5.2 Gate all three terms on `advancedSystems`; when disabled none apply
- [ ] 5.3 Tests: an `Elite` bot avoids a hostile ECM bubble; an `Elite` bot jumps to elevation; a `Veteran` bot is unaffected by all three terms

## 6. Verification

- [ ] 6.1 Integration test: an `Elite` bot jumps over an impassable ridge a `Veteran` bot walks around
- [ ] 6.2 Integration test: an `Elite` bot routes its lance clear of an enemy ECM bubble; a `Veteran` bot walks through it
- [ ] 6.3 Integration test: an `Elite` bot repositions to scout an unspotted enemy; a `Veteran` bot does not
- [ ] 6.4 Confirm A4 touches no core combat-resolution code — `electronicWarfare/` and `fogOfWar.ts` are byte-identical to pre-change
- [ ] 6.5 Determinism test: SimulationRunner golden traces on the `Veteran` tier are byte-identical to pre-change traces
- [ ] 6.6 `npx openspec validate add-ai-advanced-systems --strict` reports valid
- [ ] 6.7 Build, lint, and typecheck pass
