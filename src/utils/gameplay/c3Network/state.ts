import { IHexCoordinate } from '@/types/gameplay';

import { IC3Network, IC3NetworkState } from './types';

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
