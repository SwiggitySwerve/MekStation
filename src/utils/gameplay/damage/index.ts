export { applyDamageToLocation, applyDamageWithTransfer } from './location';
export { checkCriticalHitTrigger, getCriticalHitCount } from './critical';
export { applyPilotDamage } from './pilot';
export { checkUnitDestruction } from './destruction';
export { resolveDamage } from './resolve';
export { applyDamageWithTerrainEffects } from './terrain';
export {
  createDamageState,
  getLocationDamageCapacity,
  getLocationHealthPercent,
} from './utilities';
export {
  FATAL_LOCATION_DESTRUCTION,
  PILOT_DEATH_WOUND_THRESHOLD,
  STANDARD_STRUCTURE_TABLE,
} from './constants';
export type {
  IDamageWithTransferResult,
  IDestructionCheckResult,
  ILocationDamageResult,
  IPilotDamageResultWithState,
  IResolveDamageResult,
  ITerrainDamageResult,
  IUnitDamageState,
  PilotDamageSource,
  RearArmorLocation,
} from './types';
