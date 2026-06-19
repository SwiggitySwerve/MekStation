/**
 * Stable export surface for movement-phase, attack-phase, and
 * physical-attack planning helpers used by `useGameplayStore`.
 */

export {
  clearAttackPlanLogic,
  commitAttackLogic,
  setAttackTargetLogic,
  setPlannedWeaponModeLogic,
  togglePlannedWeaponLogic,
} from './useGameplayStore.attackPlan';
export type {
  CombatFlowsSlice,
  GetFn,
  IAttackPlan,
  IPhysicalAttackPlan,
  IPlannedMovement,
  SetFn,
} from './useGameplayStore.combatFlowTypes';
export {
  getAttackPlanFor,
  isPhysicalAttackPhase,
  shouldClearAttackPlanOnPhaseChange,
} from './useGameplayStore.combatFlowSelectors';
export {
  applyRuntimeMovementStateForSelectedUnitLogic,
  clearPlannedMovementLogic,
  commitPlannedMovementLogic,
  enterHullDownActiveUnitLogic,
  goProneActiveUnitLogic,
  setPlannedMovementLogic,
  standActiveUnitLogic,
} from './useGameplayStore.movementPlan';
export { usePhysicalAttackPlanStore } from './useGameplayStore.physicalAttackPlan';
export type {
  ICommitPhysicalAttackArgs,
  IPhysicalAttackPlanState,
} from './useGameplayStore.physicalAttackPlan';
