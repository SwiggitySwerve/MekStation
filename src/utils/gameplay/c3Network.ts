/**
 * C3 Network Targeting Module
 *
 * Implements BattleTech C3 (Command, Control, Communications) and C3i (Improved)
 * network targeting systems:
 * - C3 Master/Slave: 4-unit max, requires master, master destruction dissolves network
 * - C3i (Improved): 6-unit max, peer-to-peer, no single point of failure
 * - Targeting benefit: use best range bracket among networked units with LOS to target
 * - ECM disruption: ECM blocks C3 benefit for affected attacks (flag-based check)
 *
 * @spec openspec/specs/c3-network-targeting/spec.md
 */

export {
  createC3MasterSlaveNetwork,
  createC3iNetwork,
  createC3Unit,
} from './c3Network/creation';
export {
  addC3Network,
  createEmptyC3State,
  destroyC3Unit,
  getUnitNetwork,
  removeC3Network,
  updateC3UnitECMStatus,
  updateC3UnitPosition,
} from './c3Network/state';
export { getC3TargetingBenefit, isBetterBracket } from './c3Network/targeting';
export type {
  C3NetworkType,
  C3UnitRole,
  IC3Network,
  IC3NetworkState,
  IC3NetworkUnit,
  IC3TargetingResult,
} from './c3Network/types';
export {
  C3_MASTER_SLAVE_MAX_UNITS,
  C3I_MAX_UNITS,
} from './c3Network/types';
