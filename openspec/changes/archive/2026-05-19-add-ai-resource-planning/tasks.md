# Tasks: Add AI Resource Planning

## 1. Resource Tier Parameters

- [x] 1.1 Add `IAITierResourceParameters` (`heatLookaheadTurns`, `ammoConservationWeight`, `critSeekingWeight`, `weaponModeSelection`) and an optional `resource` block on `IAITierParameters` in `src/simulation/ai/AITierRegistry.ts`
- [x] 1.2 Populate the `resource` block per tier — `Green`/`Regular` fully inert (`heatLookaheadTurns: 0`, zeroed weights, `weaponModeSelection: false`); `Veteran`/`Elite` populated
- [x] 1.3 Tests: every tier resolves a `resource` block; `Green`/`Regular` values disable all A2 behavior

## 2. Multi-Turn Heat Projection

- [x] 2.1 Create `src/simulation/ai/AIHeatPlanner.ts` with `projectHeat(currentHeat, dissipation, perTurnHeatGenerated, lookaheadTurns)` returning `IHeatProjection`
- [x] 2.2 Project per-turn heat across the lookahead window and report the first turn a shutdown risk is predicted (or `-1`)
- [x] 2.3 In `AttackAI`, when a shutdown is predicted inside the window, lower the effective heat budget passed to `applyHeatBudget`
- [x] 2.4 Tests: a rising heat curve flags the correct shutdown turn; a sustainable fire list reports `-1`; `heatLookaheadTurns: 0` skips projection entirely

## 3. Ammo-Runway Projection

- [x] 3.1 Create `src/simulation/ai/AIAmmoRunway.ts` computing per-weapon `turnsRemaining` and `conservationWeight`
- [x] 3.2 Energy weapons report `Infinity` turns and a neutral conservation weight
- [x] 3.3 Feed `conservationWeight` into weapon selection priority — short runway lowers priority; the binary 0-ammo cull is unchanged
- [x] 3.4 Tests: scarce ammo lowers a weapon's selection priority without culling it; abundant ammo is neutral; energy weapons are unaffected

## 4. Crit-Seeking Target Weighting

- [x] 4.1 Surface target structure-state fields (per-location armor and internal structure remaining) on `IAIUnitState`
- [x] 4.2 Add an additive crit-seeking term to `scoreTarget`, multiplied by `critSeekingWeight`, proportional to the target's structural exposure
- [x] 4.3 A fully-armored target SHALL receive zero crit-seeking bonus; an open side torso SHALL receive a large one
- [x] 4.4 Tests: crit-seeking raises an exposed target's score; a fresh heavy still outscores a near-dead light when its threat dominates; `critSeekingWeight: 0` yields the pre-change score

## 5. Weapon-Mode Selection

- [x] 5.1 Add optional firing-mode metadata to `IWeapon`; weapons without it are single-mode
- [x] 5.2 Create `src/simulation/ai/AIWeaponModeSelector.ts` picking the expected-damage-maximizing mode given range, target armor state, and heat budget
- [x] 5.3 LB-X: cluster against armor-stripped/evading targets, slug against fresh armored targets at short range
- [x] 5.4 Ultra/Rotary: higher rate of fire when heat and ammo runway allow, lower rate otherwise
- [x] 5.5 Record the selected mode on the declared attack; gate selection on `weaponModeSelection`
- [x] 5.6 Tests: LB-X picks cluster vs. an open target and slug vs. a fresh one; Ultra drops to single fire under heat pressure; a single-mode weapon passes through unchanged

## 6. Verification

- [x] 6.1 Integration test: a `Veteran` bot throttles its alpha strike across turns and does not shut down where a `Regular` bot does
- [x] 6.2 Integration test: a `Veteran` bot rations a low-ammo autocannon and a `Regular` bot empties it early
- [x] 6.3 Determinism test: SimulationRunner golden traces on the `Regular` tier are byte-identical to pre-change traces
- [x] 6.4 `npx openspec validate add-ai-resource-planning --strict` reports valid
- [x] 6.5 Build, lint, and typecheck pass
