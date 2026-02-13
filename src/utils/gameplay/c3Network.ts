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

import { IHexCoordinate, RangeBracket } from '@/types/gameplay';

import { hexDistance } from './hexMath';
import { getWeaponRangeBracket, IWeaponRangeProfile } from './range';

// =============================================================================
// Types
// =============================================================================

/** C3 network type */
export type C3NetworkType = 'master-slave' | 'improved';

/** Role of a unit within a C3 network */
export type C3UnitRole = 'master' | 'slave' | 'c3i';

/** A unit participating in a C3 network */
export interface IC3NetworkUnit {
  /** Unit entity ID */
  readonly entityId: string;
  /** Team/player ID */
  readonly teamId: string;
  /** Role in the network */
  readonly role: C3UnitRole;
  /** Current hex position */
  readonly position: IHexCoordinate;
  /** Whether the unit is operational (not destroyed) */
  readonly operational: boolean;
  /**
   * Whether this unit's C3 is disrupted by ECM.
   * Set via {@link updateC3UnitECMStatus} after resolving ECM status with
   * {@link resolveECMStatus} from electronicWarfare.ts, or use the convenience
   * helper {@link resolveC3ECMDisruption} to batch-update all C3 members.
   */
  readonly ecmDisrupted: boolean;
}

/** A C3 network connecting multiple units */
export interface IC3Network {
  /** Unique network ID */
  readonly networkId: string;
  /** Network type */
  readonly type: C3NetworkType;
  /** Team that owns this network */
  readonly teamId: string;
  /** Units in the network */
  readonly members: readonly IC3NetworkUnit[];
}

/** Battlefield C3 network state */
export interface IC3NetworkState {
  /** All active C3 networks on the battlefield */
  readonly networks: readonly IC3Network[];
}

/** Result of attempting to get C3 targeting benefit */
export interface IC3TargetingResult {
  /** Whether C3 benefit applies */
  readonly benefitApplied: boolean;
  /** Best range bracket found across network */
  readonly bestBracket: RangeBracket;
  /** Entity ID of the unit providing the best range */
  readonly spotterId: string | null;
  /** Distance from spotter to target */
  readonly spotterRange: number | null;
  /** Reason if benefit was denied */
  readonly denialReason: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum units in a C3 Master/Slave network */
export const C3_MASTER_SLAVE_MAX_UNITS = 4;

/** Maximum units in a C3i (Improved) network */
export const C3I_MAX_UNITS = 6;

// =============================================================================
// Network Formation
// =============================================================================

/**
 * Create a C3 Master/Slave network.
 *
 * Validates:
 * - Exactly one master unit
 * - All other units are slaves
 * - Maximum 4 units total
 * - All units on the same team
 *
 * Returns null if validation fails.
 */
export function createC3MasterSlaveNetwork(
  networkId: string,
  members: readonly IC3NetworkUnit[],
): IC3Network | null {
  if (members.length === 0 || members.length > C3_MASTER_SLAVE_MAX_UNITS) {
    return null;
  }

  const masters = members.filter((m) => m.role === 'master');
  const slaves = members.filter((m) => m.role === 'slave');

  // Must have exactly 1 master
  if (masters.length !== 1) {
    return null;
  }

  // All non-master units must be slaves
  if (masters.length + slaves.length !== members.length) {
    return null;
  }

  // All units must be on the same team
  const teamId = members[0].teamId;
  if (!members.every((m) => m.teamId === teamId)) {
    return null;
  }

  return {
    networkId,
    type: 'master-slave',
    teamId,
    members,
  };
}

/**
 * Create a C3i (Improved) peer-to-peer network.
 *
 * Validates:
 * - All units have C3i role
 * - Maximum 6 units
 * - All units on the same team
 *
 * Returns null if validation fails.
 */
export function createC3iNetwork(
  networkId: string,
  members: readonly IC3NetworkUnit[],
): IC3Network | null {
  if (members.length === 0 || members.length > C3I_MAX_UNITS) {
    return null;
  }

  // All must be c3i role
  if (!members.every((m) => m.role === 'c3i')) {
    return null;
  }

  // All units must be on the same team
  const teamId = members[0].teamId;
  if (!members.every((m) => m.teamId === teamId)) {
    return null;
  }

  return {
    networkId,
    type: 'improved',
    teamId,
    members,
  };
}

// =============================================================================
// Network State Management
// =============================================================================

/**
 * Create an empty C3 network state.
 */
export function createEmptyC3State(): IC3NetworkState {
  return { networks: [] };
}

/**
 * Add a network to the battlefield state.
 */
export function addC3Network(
  state: IC3NetworkState,
  network: IC3Network,
): IC3NetworkState {
  return {
    networks: [...state.networks, network],
  };
}

/**
 * Remove a network from the battlefield state.
 */
export function removeC3Network(
  state: IC3NetworkState,
  networkId: string,
): IC3NetworkState {
  return {
    networks: state.networks.filter((n) => n.networkId !== networkId),
  };
}

/**
 * Find the network a unit belongs to.
 */
export function getUnitNetwork(
  state: IC3NetworkState,
  entityId: string,
): IC3Network | null {
  return (
    state.networks.find((n) =>
      n.members.some((m) => m.entityId === entityId),
    ) ?? null
  );
}

/**
 * Update a unit's position within its network.
 */
export function updateC3UnitPosition(
  state: IC3NetworkState,
  entityId: string,
  newPosition: IHexCoordinate,
): IC3NetworkState {
  return {
    networks: state.networks.map((network) => ({
      ...network,
      members: network.members.map((m) =>
        m.entityId === entityId ? { ...m, position: newPosition } : m,
      ),
    })),
  };
}

/**
 * Update a unit's ECM disruption status.
 * Called after resolving ECM via {@link resolveECMStatus} from electronicWarfare.ts.
 */
export function updateC3UnitECMStatus(
  state: IC3NetworkState,
  entityId: string,
  ecmDisrupted: boolean,
): IC3NetworkState {
  return {
    networks: state.networks.map((network) => ({
      ...network,
      members: network.members.map((m) =>
        m.entityId === entityId ? { ...m, ecmDisrupted } : m,
      ),
    })),
  };
}

// =============================================================================
// Network Dissolution (Master Destruction / Unit Loss)
// =============================================================================

/**
 * Handle a unit being destroyed within a C3 network.
 *
 * - C3 Master/Slave: If the master is destroyed, the ENTIRE network dissolves.
 *   If a slave is destroyed, it is simply removed from the network.
 * - C3i: The destroyed unit is removed but the network continues with survivors.
 *
 * Returns the updated state.
 */
export function destroyC3Unit(
  state: IC3NetworkState,
  entityId: string,
): IC3NetworkState {
  const network = getUnitNetwork(state, entityId);
  if (!network) {
    return state;
  }

  const member = network.members.find((m) => m.entityId === entityId);
  if (!member) {
    return state;
  }

  // C3 Master/Slave: master destruction dissolves the whole network
  if (network.type === 'master-slave' && member.role === 'master') {
    return removeC3Network(state, network.networkId);
  }

  // Otherwise: remove the destroyed unit from the network
  const remainingMembers = network.members.filter(
    (m) => m.entityId !== entityId,
  );

  // If fewer than 2 members remain, dissolve the network (no benefit with 1 unit)
  if (remainingMembers.length < 2) {
    return removeC3Network(state, network.networkId);
  }

  return {
    networks: state.networks.map((n) =>
      n.networkId === network.networkId
        ? { ...n, members: remainingMembers }
        : n,
    ),
  };
}

// =============================================================================
// C3 Targeting Benefit (Range Bracket Sharing)
// =============================================================================

/**
 * Get the best range bracket to a target from all operational, non-ECM-disrupted
 * units in the attacker's C3 network.
 *
 * This is the core C3 targeting mechanic: the attacker uses the best range bracket
 * among all networked units that have LOS to the target.
 *
 * @param attackerEntityId - The attacking unit's entity ID
 * @param targetPosition - Target hex position
 * @param weaponRangeProfile - The weapon's range profile
 * @param c3State - Battlefield C3 network state
 * @param attackerEcmDisrupted - Whether the attacker is ECM-disrupted
 *   (overrides the per-unit flag; for callers who compute ECM externally)
 * @returns C3 targeting result with best bracket and spotter info
 */
export function getC3TargetingBenefit(
  attackerEntityId: string,
  targetPosition: IHexCoordinate,
  weaponRangeProfile: IWeaponRangeProfile,
  c3State: IC3NetworkState,
  attackerEcmDisrupted?: boolean,
): IC3TargetingResult {
  const noBenefit = (reason: string): IC3TargetingResult => ({
    benefitApplied: false,
    bestBracket: RangeBracket.OutOfRange,
    spotterId: null,
    spotterRange: null,
    denialReason: reason,
  });

  // Find the attacker's network
  const network = getUnitNetwork(c3State, attackerEntityId);
  if (!network) {
    return noBenefit('Unit is not in a C3 network');
  }

  const attackerUnit = network.members.find(
    (m) => m.entityId === attackerEntityId,
  );
  if (!attackerUnit || !attackerUnit.operational) {
    return noBenefit('Attacker unit is not operational');
  }

  // Check ECM disruption on the attacker
  const isDisrupted =
    attackerEcmDisrupted !== undefined
      ? attackerEcmDisrupted
      : attackerUnit.ecmDisrupted;

  if (isDisrupted) {
    return noBenefit('C3 Network disrupted by ECM');
  }

  // Gather all operational, non-disrupted network members
  const activeMembers = network.members.filter(
    (m) => m.operational && !m.ecmDisrupted,
  );

  if (activeMembers.length < 2) {
    return noBenefit('Not enough active units in network');
  }

  // Find the best range bracket among all active network members
  let bestBracket: RangeBracket = RangeBracket.OutOfRange;
  let bestDistance = Infinity;
  let spotterId: string | null = null;

  for (const member of activeMembers) {
    const distance = hexDistance(member.position, targetPosition);
    const bracket = getWeaponRangeBracket(distance, weaponRangeProfile);

    if (isBetterBracket(bracket, bestBracket)) {
      bestBracket = bracket;
      bestDistance = distance;
      spotterId = member.entityId;
    } else if (bracket === bestBracket && distance < bestDistance) {
      // Same bracket but closer — prefer closer spotter
      bestDistance = distance;
      spotterId = member.entityId;
    }
  }

  if (bestBracket === RangeBracket.OutOfRange) {
    return noBenefit('No networked unit has target in range');
  }

  // Check if benefit actually improves the attacker's own bracket
  const attackerDistance = hexDistance(attackerUnit.position, targetPosition);
  const attackerBracket = getWeaponRangeBracket(
    attackerDistance,
    weaponRangeProfile,
  );

  if (!isBetterBracket(bestBracket, attackerBracket)) {
    return {
      benefitApplied: false,
      bestBracket: attackerBracket,
      spotterId: null,
      spotterRange: null,
      denialReason: null,
    };
  }

  return {
    benefitApplied: true,
    bestBracket,
    spotterId,
    spotterRange: bestDistance,
    denialReason: null,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Range bracket ordering (lower index = better/closer) */
const BRACKET_ORDER: readonly RangeBracket[] = [
  RangeBracket.Short,
  RangeBracket.Medium,
  RangeBracket.Long,
  RangeBracket.Extreme,
  RangeBracket.OutOfRange,
];

/**
 * Returns true if `a` is a strictly better (closer) range bracket than `b`.
 */
export function isBetterBracket(a: RangeBracket, b: RangeBracket): boolean {
  return BRACKET_ORDER.indexOf(a) < BRACKET_ORDER.indexOf(b);
}

/**
 * Create a C3 network unit helper (for concise test/call-site construction).
 */
export function createC3Unit(
  overrides: Partial<IC3NetworkUnit> &
    Pick<IC3NetworkUnit, 'entityId' | 'teamId' | 'role'>,
): IC3NetworkUnit {
  return {
    position: { q: 0, r: 0 },
    operational: true,
    ecmDisrupted: false,
    ...overrides,
  };
}
