/** Public compatibility facade; implementations are split by responsibility. */
export { scoreTarget, structuralExposure } from './AttackAITargetScoring';
export {
  orderWeaponsByEfficiency,
  applyHeatBudget,
} from './AttackAIWeaponSelection';
export type { IFireListEntry } from './AttackAIPlanner';
export { AttackAI, __testing__ } from './AttackAIPlanner';
