export * from './battleValueExplosivePenalties';
export * from './battleValueMovement';
export * from './battleValueDefensive';
export * from './battleValueOffensive';
export * from './battleValueTotals';
export * from './battleValuePilot';

// Infantry BV — separate calculator for conventional infantry platoons.
// Callers route IInfantryUnit (store state) through `computeInfantryBVFromState`
// in the adapter, which builds a well-typed `InfantryBVInput` and calls
// `calculateInfantryBV`. The existing `calculateTotalBV(config)` remains the
// mech/battlemech entry point.
// @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
export {
  calculateInfantryBV,
  calculateInfantryPerTrooperBV,
  calculateInfantryPrimaryBV,
  calculateInfantrySecondaryBV,
  calculateInfantryFieldGunBV,
  getInfantryMotiveMultiplier,
  getInfantryPilotMultiplier,
} from './infantry/infantryBV';
export type {
  InfantryBVInput,
  InfantryWeaponRef,
  InfantryFieldGunMount,
  IInfantryBVBreakdown,
} from './infantry/infantryBV';
