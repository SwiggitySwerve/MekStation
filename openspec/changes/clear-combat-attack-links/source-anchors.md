# C9 source citation re-anchoring

Base: `0217646cc6d4b938937df6caf31ec452ae935ce7` after C10 merged.
The later merge of `447803027` leaves these cited combat sources unchanged.

Each range was matched against its cited source content. The dispatch rows for
attack reveal, neural-interface state, minefields and swarm dismount were
checked against the named handlers; their older ranges pointed at neighboring
events. The lifecycle description now describes the actual replay handlers.

`CombatSourceRefAnchorRemap.ts` was audited: none of its remap targets refer to
a source shifted by C9, so no remap-table edit is needed.

| Citation owner | Source | Before | After | Content at new start |
| --- | --- | --- | --- | --- |
| `CombatBattleMechEventSourceRefs.combat.ts` | `src/simulation/runner/phases/postCombatPsr.ts` | 76-243 | 77-244 | `function applyPsrStuckResult(options: {` |
| `CombatBattleMechEventSourceRefs.combat.ts` | `src/simulation/runner/phases/postCombatHeatLifecycle.ts` | 97-159 | 98-160 | `readonly unit: IUnitGameState;` |
| `CombatBattleMechEventSourceRefs.combat.ts` | `src/simulation/runner/phases/physicalAttackEvents.ts` | 17-72 | 18-73 | `import { appendUnitDestroyedEvent, createGameEvent } from './utils';` |
| `CombatBattleMechEventSourceRefs.lifecycle.ts` | `src/utils/gameplay/gameState/eventDispatch.ts` | 192-312 | 187-307 | `const EVENT_HANDLERS: Partial<Record<GameEventType, EventHandler>> = {` |
| `CombatBattleMechEventSourceRefs.lifecycle.ts` | `src/utils/gameplay/gameState/eventDispatch.ts` | 224-225 | 219-220 | `[GameEventType.AttacksRevealed]:` |
| `CombatBattleMechEventSourceRefs.lifecycle.ts` | `src/utils/gameplay/gameState/eventDispatch.ts` | 291-296 | 290-296 | `[GameEventType.MinefieldChanged]: withPayload<IMinefieldChangedPayload>(` |
| `CombatBattleMechEventSourceRefs.terminal.ts` | `src/utils/gameplay/gameState/unitExitState.ts` | 58-72 | 60-75 | `export function applyUnitEjected(` |
| `CombatBattleMechEventSourceRefs.terminal.ts` | `src/utils/gameplay/gameState/unitExitState.ts` | 74-86 | 77-89 | `export function applyNeuralInterfaceStateChanged(` |
| `CombatBattleMechEventSourceRefs.terminal.ts` | `src/utils/gameplay/gameState/eventDispatch.ts` | 272-275 | 271-274 | `[GameEventType.NeuralInterfaceStateChanged]:` |
| `CombatBattleMechEventSourceRefs.terminal.ts` | `src/engine/__tests__/InteractiveSession.withdrawal.test.ts` | 129-163 | 130-164 | `it('emits a player WithdrawalDeclared event and flags the unit', () => {` |
| `CombatCanonicalSpaSupport.sourceRefs.bioware.ts` | `src/utils/gameplay/gameState/unitExitState.ts` | 74-86 | 77-89 | `export function applyNeuralInterfaceStateChanged(` |
| `CombatCanonicalSpaSupport.sourceRefs.general.ts` | `src/simulation/runner/phases/ammoExplosionPilotDamage.ts` | 47-54 | 48-55 | `const wounds = resolveBattleMechAmmoExplosionPilotDamage({` |
| `CombatCanonicalSpaSupport.sourceRefs.general.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 135-146 | 136-147 | `const eagleEyesRangeBonus = hasSPA(` |
| `CombatDamageSourceRefs.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 454-538 | 455-542 | `const target = state.units[targetId];` |
| `CombatDamageSourceRefs.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 504-520 | 505-521 | `const destructionCause = damageResult.unitDestroyed` |
| `CombatEdgeSourceRefs.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 289-308 | 290-309 | `const abilities = hydratePilotAbilitiesFromFullUnit(hydrated.fullUnit);` |
| `CombatIntegrationSupport.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 544-561 | 548-565 | `export function isGameOver(state: IGameState, turnLimit = 0): boolean {` |
| `CombatLifecycleSourceRefs.ts` | `src/utils/gameplay/gameState/unitExitState.ts` | 44-56 | 45-58 | `export function applyUnitRetreated(` |
| `CombatLifecycleSourceRefs.ts` | `src/utils/gameplay/gameState/unitExitState.ts` | 58-72 | 60-75 | `export function applyUnitEjected(` |
| `CombatLifecycleSourceRefs.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 540-561 | 544-565 | `export function isUnitOperable(unit: IUnitGameState): boolean {` |
| `CombatLifecycleSupport.sourceRefs.ts` | `src/simulation/runner/phases/postCombatPsr.ts` | 278-330 | 279-331 | `export function runPSRPhase(options: {` |
| `CombatParitySupport.ts` | `src/simulation/runner/phases/postCombatHeatLifecycle.ts` | 198-230 | 199-231 | `readonly unit: IUnitGameState;` |
| `CombatParitySupport.ts` | `src/simulation/runner/phases/postCombatPsr.ts` | 278-330 | 279-331 | `export function runPSRPhase(options: {` |
| `CombatPilotModifierApplicationSupport.sourceRefs.eagleEyes.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 135-146 | 136-147 | `const eagleEyesRangeBonus = hasSPA(` |
| `CombatPilotSkillSourceRefs.ts` | `src/simulation/runner/phases/postCombatPsr.ts` | 300-313 | 301-314 | `const pendingPSRs = unit.pendingPSRs ?? [];` |
| `CombatPsrTriggerSourceRefs.ts` | `src/simulation/runner/phases/postCombatPsr.ts` | 123-167 | 124-168 | `function applyMovementEnhancementFailureDamage(options: {` |
| `CombatPsrTriggerSourceRefs.ts` | `src/simulation/runner/phases/postCombatHeatLifecycle.ts` | 97-159 | 98-160 | `readonly unit: IUnitGameState;` |
| `CombatRuleSupport.movement.ts` | `src/utils/gameplay/gameState/eventDispatch.ts` | 151-188 | 155-183 | `function applySwarmDismounted(` |
| `CombatRuleSupport.movement.ts` | `src/utils/gameplay/gameState/eventDispatch.ts` | 298-299 | 297-298 | `[GameEventType.SwarmDismounted]:` |
| `CombatRuleSupport.movement.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 370-391 | 371-392 | `const wentProne =` |
| `CombatRuleSupport.movement.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 388-390 | 389-391 | `prone: wentProne ? true : unit.prone,` |
| `CombatRuleSupport.terrainMinefields.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 388-390 | 389-391 | `prone: wentProne ? true : unit.prone,` |
| `CombatSpecialWeaponSourceRefs.ewArtemis.ts` | `src/simulation/runner/SimulationRunnerState.ts` | 110-126 | 111-127 | `const ecmSuites: IElectronicWarfareState['ecmSuites'] = Object.entries(` |
| `CombatTerrainEnvironmentSourceRefs.ts` | `src/simulation/runner/phases/postCombatPsr.ts` | 76-121 | 77-122 | `function applyPsrStuckResult(options: {` |
| `__tests__/combatEventCatalog.contract.test.ts` | `src/utils/gameplay/gameState/unitExitState.ts` | 58-72 | 60-75 | `export function applyUnitEjected(` |
| `__tests__/combatEventCatalog.contract.test.ts` | `src/utils/gameplay/gameState/eventDispatch.ts` | 224-225 | 219-220 | `[GameEventType.AttacksRevealed]:` |
| `__tests__/combatEventCatalog.contract.test.ts` | `src/simulation/runner/phases/postCombatPsr.ts` | 76-243 | 77-244 | `function applyPsrStuckResult(options: {` |
