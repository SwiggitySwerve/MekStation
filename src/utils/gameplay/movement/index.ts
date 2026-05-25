export type { UnitMovementType } from './types';
export { createMovementRecord } from './types';
export {
  calculateRunMP,
  createMovementCapability,
  getMaxMP,
  getHexMovementCost,
  getMovementStepCostBreakdown,
  calculatePathMovementCost,
  estimateMovementCost,
} from './calculations';
export type { IMovementStepCostBreakdown } from './calculations';
export { movementModeForPath, movementModeForRange } from './mode';
export {
  resolveRuntimeMovementCapability,
  runtimeUnitHeightForMovement,
} from './runtimeCapability';
export {
  validateMovement,
  canStand,
  getStandingCost,
  getValidDestinations,
} from './validation';
export {
  validateCommittedMovement,
  movementInvalidReasonFromValidation,
} from './commitValidation';
export type {
  ICommittedMovementValidationInput,
  CommittedMovementValidationResult,
} from './commitValidation';
export {
  calculateMovementHeat,
  calculateTMM,
  calculateAttackerMovementModifier,
} from './modifiers';
export { findPath } from './pathfinding';
export { deriveReachableHexes } from './reachable';
export { gridWithUnitOccupants } from './occupancy';
export { movementDeclarationLockInvalidState } from './declarationEligibility';
