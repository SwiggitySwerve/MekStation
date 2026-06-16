import { GameSide, type IUnitGameState } from '@/types/gameplay';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import type {
  C3EquipmentNetworkFormationDenialReason,
  C3UnitRole,
  IC3EquipmentNetworkFormationDenial,
  IC3EquipmentNetworkFormationResult,
  IC3NetworkState,
  IC3NetworkUnit,
} from './types';

import {
  createC3NovaNetwork,
  createC3iNetwork,
  createC3MasterSlaveNetwork,
  createC3Unit,
} from './creation';
import { addC3Network, createEmptyC3State } from './state';
import {
  C3I_MAX_UNITS,
  C3_MASTER_SLAVE_MAX_UNITS,
  C3_NOVA_MAX_UNITS,
} from './types';

const C3_ROLE_ORDER: readonly C3UnitRole[] = ['master', 'slave', 'c3i', 'nova'];

function c3RolesForUnit(unit: IUnitGameState): readonly C3UnitRole[] {
  const roles = new Set(unit.c3Equipment?.map((equipment) => equipment.role));
  if (hasBoostedCommImplantC3iAccess(unit)) {
    roles.add('c3i');
  }
  return C3_ROLE_ORDER.filter((role) => roles.has(role));
}

function hasBoostedCommImplantC3iAccess(unit: IUnitGameState): boolean {
  return hasSPA(
    [...(unit.abilities ?? []), ...(unit.pilotSpas ?? [])],
    'boost_comm_implant',
  );
}

function buildC3Member(
  unitId: string,
  unit: IUnitGameState,
  role: C3UnitRole,
): IC3NetworkUnit {
  return createC3Unit({
    entityId: unitId,
    teamId: unit.side,
    role,
    position: { ...unit.position },
    operational:
      !unit.destroyed &&
      !unit.hasEjected &&
      !unit.hasRetreated &&
      !unit.isWithdrawing &&
      unit.shutdown !== true &&
      unit.isPassenger !== true,
  });
}

function createDenial(
  teamId: GameSide,
  reason: C3EquipmentNetworkFormationDenialReason,
  unitIds: readonly string[],
  roles: readonly C3UnitRole[],
  message: string,
): IC3EquipmentNetworkFormationDenial {
  return {
    teamId,
    reason,
    unitIds: [...unitIds].sort(),
    roles: C3_ROLE_ORDER.filter((role) => roles.includes(role)),
    message,
  };
}

/**
 * Build only the unambiguous C3/C3i formations that can be inferred from
 * mounted equipment alone. Multiple masters, oversized groups, and same-side
 * partitioning require player/session authoring and intentionally produce no
 * guessed network for that side.
 */
export function evaluateConservativeC3NetworkFormationFromUnits(
  units: Readonly<Record<string, IUnitGameState>>,
): IC3EquipmentNetworkFormationResult {
  let state = createEmptyC3State();
  const denials: IC3EquipmentNetworkFormationDenial[] = [];

  for (const side of [GameSide.Player, GameSide.Opponent]) {
    const sideUnits = Object.entries(units).filter(
      ([, unit]) => unit.side === side,
    );
    const roleEntries = sideUnits
      .map(([unitId, unit]) => ({
        unitId,
        unit,
        roles: c3RolesForUnit(unit),
      }))
      .filter(({ roles }) => roles.length > 0)
      .sort((a, b) => a.unitId.localeCompare(b.unitId));

    const ambiguousEntries = roleEntries.filter(
      ({ roles }) => roles.length > 1,
    );
    if (ambiguousEntries.length > 0) {
      denials.push(
        ...ambiguousEntries.map(({ unitId, roles }) =>
          createDenial(
            side,
            'ambiguous-unit-equipment',
            [unitId],
            roles,
            'Mounted C3 equipment implies multiple network roles; player-authored assignment is required.',
          ),
        ),
      );
      continue;
    }

    const c3iEntries = roleEntries.filter(({ roles }) => roles[0] === 'c3i');
    const novaEntries = roleEntries.filter(({ roles }) => roles[0] === 'nova');
    const standardEntries = roleEntries.filter(
      ({ roles }) => roles[0] === 'master' || roles[0] === 'slave',
    );

    const populatedFamilyCount = [
      c3iEntries,
      novaEntries,
      standardEntries,
    ].filter((entries) => entries.length > 0).length;

    if (populatedFamilyCount > 1) {
      denials.push(
        createDenial(
          side,
          'mixed-network-families',
          roleEntries.map(({ unitId }) => unitId),
          ['master', 'slave', 'c3i', 'nova'],
          'Mounted C3-family equipment from multiple network families shares a side; automatic formation would guess network family selection.',
        ),
      );
      continue;
    }

    const c3iMembers = c3iEntries.map(({ unitId, unit }) =>
      buildC3Member(unitId, unit, 'c3i'),
    );

    if (c3iMembers.length === 1) {
      denials.push(
        createDenial(
          side,
          'insufficient-c3i-members',
          c3iMembers.map((member) => member.entityId),
          ['c3i'],
          'Mounted C3i equipment has no peer to form a network.',
        ),
      );
      continue;
    }

    if (c3iMembers.length > C3I_MAX_UNITS) {
      denials.push(
        createDenial(
          side,
          'oversized-c3i-network',
          c3iMembers.map((member) => member.entityId),
          ['c3i'],
          'Mounted C3i equipment exceeds the maximum automatic C3i network size.',
        ),
      );
      continue;
    }

    if (c3iMembers.length >= 2) {
      const network = createC3iNetwork(`${side}-c3i-1`, c3iMembers);
      if (network) {
        state = addC3Network(state, network);
      }
      continue;
    }

    const novaMembers = novaEntries.map(({ unitId, unit }) =>
      buildC3Member(unitId, unit, 'nova'),
    );

    if (novaMembers.length === 1) {
      denials.push(
        createDenial(
          side,
          'insufficient-nova-members',
          novaMembers.map((member) => member.entityId),
          ['nova'],
          'Mounted Nova CEWS equipment has no peer to form a network.',
        ),
      );
      continue;
    }

    if (novaMembers.length > C3_NOVA_MAX_UNITS) {
      denials.push(
        createDenial(
          side,
          'oversized-nova-network',
          novaMembers.map((member) => member.entityId),
          ['nova'],
          'Mounted Nova CEWS equipment exceeds the maximum automatic Nova network size.',
        ),
      );
      continue;
    }

    if (novaMembers.length >= 2) {
      const network = createC3NovaNetwork(`${side}-nova-cews-1`, novaMembers);
      if (network) {
        state = addC3Network(state, network);
      }
      continue;
    }

    const standardMembers = standardEntries.map(({ unitId, unit, roles }) =>
      buildC3Member(unitId, unit, roles[0]),
    );
    const masterCount = standardMembers.filter(
      (member) => member.role === 'master',
    ).length;
    const slaveCount = standardMembers.filter(
      (member) => member.role === 'slave',
    ).length;

    if (standardMembers.length === 0) {
      continue;
    }

    if (masterCount === 0 || slaveCount === 0) {
      denials.push(
        createDenial(
          side,
          'incomplete-master-slave-network',
          standardMembers.map((member) => member.entityId),
          masterCount > 0 ? ['master'] : ['slave'],
          'Mounted C3 master/slave equipment lacks the complementary role required to form a network.',
        ),
      );
      continue;
    }

    if (masterCount > 1) {
      denials.push(
        createDenial(
          side,
          'multiple-master-units',
          standardMembers
            .filter((member) => member.role === 'master')
            .map((member) => member.entityId),
          ['master'],
          'Multiple mounted C3 masters require player-authored slave assignment.',
        ),
      );
      continue;
    }

    if (standardMembers.length > C3_MASTER_SLAVE_MAX_UNITS) {
      denials.push(
        createDenial(
          side,
          'oversized-master-slave-network',
          standardMembers.map((member) => member.entityId),
          ['master', 'slave'],
          'Mounted C3 master/slave equipment exceeds the maximum automatic network size.',
        ),
      );
      continue;
    }

    const network = createC3MasterSlaveNetwork(
      `${side}-c3-master-slave-1`,
      standardMembers,
    );
    if (network) {
      state = addC3Network(state, network);
    }
  }

  return {
    ...(state.networks.length > 0 ? { state } : {}),
    denials,
  };
}

export function buildConservativeC3NetworkStateFromUnits(
  units: Readonly<Record<string, IUnitGameState>>,
): IC3NetworkState | undefined {
  return evaluateConservativeC3NetworkFormationFromUnits(units).state;
}
