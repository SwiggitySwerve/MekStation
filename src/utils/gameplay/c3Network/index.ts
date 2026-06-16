export {
  createC3NovaNetwork,
  createC3MasterSlaveNetwork,
  createC3iNetwork,
  createC3Unit,
} from './creation';
export {
  addC3Network,
  createEmptyC3State,
  destroyC3Unit,
  getUnitNetwork,
  removeC3Network,
  updateC3UnitECMStatus,
  updateC3UnitOperationalStatus,
  updateC3UnitPosition,
} from './state';
export {
  buildConservativeC3NetworkStateFromUnits,
  evaluateConservativeC3NetworkFormationFromUnits,
} from './automaticFormation';
export { hydrateC3NetworkStateFromGameState } from './stateHydration';
export { getC3TargetingBenefit, isBetterBracket } from './targeting';
export type {
  C3EquipmentNetworkFormationDenialReason,
  C3NetworkType,
  C3UnitRole,
  IC3EquipmentMountState,
  IC3EquipmentNetworkFormationDenial,
  IC3EquipmentNetworkFormationResult,
  IC3Network,
  IC3NetworkState,
  IC3NetworkUnit,
  IC3TargetingOptions,
  IC3TargetingResult,
} from './types';
export {
  C3_MASTER_SLAVE_MAX_UNITS,
  C3I_MAX_UNITS,
  C3_NOVA_MAX_UNITS,
} from './types';
