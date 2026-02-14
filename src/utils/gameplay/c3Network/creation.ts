import {
  C3_MASTER_SLAVE_MAX_UNITS,
  C3I_MAX_UNITS,
  IC3Network,
  IC3NetworkUnit,
} from './types';

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
