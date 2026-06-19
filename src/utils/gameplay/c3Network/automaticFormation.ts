import { GameSide, type IUnitGameState } from '@/types/gameplay';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import type {
  C3EquipmentNetworkFormationDenialReason,
  C3UnitRole,
  IC3EquipmentNetworkFormationDenial,
  IC3EquipmentNetworkFormationResult,
  IC3Network,
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
const C3_FORMATION_SIDES: readonly GameSide[] = [
  GameSide.Player,
  GameSide.Opponent,
];

interface RoleEntry {
  readonly unitId: string;
  readonly unit: IUnitGameState;
  readonly roles: readonly C3UnitRole[];
}

interface FamilyEntries {
  readonly c3i: readonly RoleEntry[];
  readonly nova: readonly RoleEntry[];
  readonly standard: readonly RoleEntry[];
}

interface SideEvaluation {
  readonly networks: readonly IC3Network[];
  readonly denials: readonly IC3EquipmentNetworkFormationDenial[];
}

const EMPTY_EVALUATION: SideEvaluation = {
  networks: [],
  denials: [],
};

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

function collectRoleEntries(
  units: Readonly<Record<string, IUnitGameState>>,
  side: GameSide,
): readonly RoleEntry[] {
  return Object.entries(units)
    .filter(([, unit]) => unit.side === side)
    .map(([unitId, unit]) => ({
      unitId,
      unit,
      roles: c3RolesForUnit(unit),
    }))
    .filter(({ roles }) => roles.length > 0)
    .sort((a, b) => a.unitId.localeCompare(b.unitId));
}

function createAmbiguousEquipmentDenials(
  side: GameSide,
  roleEntries: readonly RoleEntry[],
): readonly IC3EquipmentNetworkFormationDenial[] {
  return roleEntries
    .filter(({ roles }) => roles.length > 1)
    .map(({ unitId, roles }) =>
      createDenial(
        side,
        'ambiguous-unit-equipment',
        [unitId],
        roles,
        'Mounted C3 equipment implies multiple network roles; player-authored assignment is required.',
      ),
    );
}

function splitFamilyEntries(roleEntries: readonly RoleEntry[]): FamilyEntries {
  return {
    c3i: roleEntries.filter(({ roles }) => roles[0] === 'c3i'),
    nova: roleEntries.filter(({ roles }) => roles[0] === 'nova'),
    standard: roleEntries.filter(
      ({ roles }) => roles[0] === 'master' || roles[0] === 'slave',
    ),
  };
}

function createMixedFamilyDenial(
  side: GameSide,
  roleEntries: readonly RoleEntry[],
): IC3EquipmentNetworkFormationDenial {
  return createDenial(
    side,
    'mixed-network-families',
    roleEntries.map(({ unitId }) => unitId),
    ['master', 'slave', 'c3i', 'nova'],
    'Mounted C3-family equipment from multiple network families shares a side; automatic formation would guess network family selection.',
  );
}

function buildC3Members(
  entries: readonly RoleEntry[],
  role: C3UnitRole,
): readonly IC3NetworkUnit[] {
  return entries.map(({ unitId, unit }) => buildC3Member(unitId, unit, role));
}

function evaluateC3iFamily(
  side: GameSide,
  entries: readonly RoleEntry[],
): SideEvaluation {
  const members = buildC3Members(entries, 'c3i');

  if (members.length === 1) {
    return {
      networks: [],
      denials: [
        createDenial(
          side,
          'insufficient-c3i-members',
          members.map((member) => member.entityId),
          ['c3i'],
          'Mounted C3i equipment has no peer to form a network.',
        ),
      ],
    };
  }

  if (members.length > C3I_MAX_UNITS) {
    return {
      networks: [],
      denials: [
        createDenial(
          side,
          'oversized-c3i-network',
          members.map((member) => member.entityId),
          ['c3i'],
          'Mounted C3i equipment exceeds the maximum automatic C3i network size.',
        ),
      ],
    };
  }

  const network = createC3iNetwork(`${side}-c3i-1`, members);
  return network ? { networks: [network], denials: [] } : EMPTY_EVALUATION;
}

function evaluateNovaFamily(
  side: GameSide,
  entries: readonly RoleEntry[],
): SideEvaluation {
  const members = buildC3Members(entries, 'nova');

  if (members.length === 1) {
    return {
      networks: [],
      denials: [
        createDenial(
          side,
          'insufficient-nova-members',
          members.map((member) => member.entityId),
          ['nova'],
          'Mounted Nova CEWS equipment has no peer to form a network.',
        ),
      ],
    };
  }

  if (members.length > C3_NOVA_MAX_UNITS) {
    return {
      networks: [],
      denials: [
        createDenial(
          side,
          'oversized-nova-network',
          members.map((member) => member.entityId),
          ['nova'],
          'Mounted Nova CEWS equipment exceeds the maximum automatic Nova network size.',
        ),
      ],
    };
  }

  const network = createC3NovaNetwork(`${side}-nova-cews-1`, members);
  return network ? { networks: [network], denials: [] } : EMPTY_EVALUATION;
}

function evaluateStandardFamily(
  side: GameSide,
  entries: readonly RoleEntry[],
): SideEvaluation {
  const members = entries.map(({ unitId, unit, roles }) =>
    buildC3Member(unitId, unit, roles[0]),
  );
  const masterMembers = members.filter((member) => member.role === 'master');
  const slaveMembers = members.filter((member) => member.role === 'slave');

  if (masterMembers.length === 0 || slaveMembers.length === 0) {
    return {
      networks: [],
      denials: [
        createDenial(
          side,
          'incomplete-master-slave-network',
          members.map((member) => member.entityId),
          masterMembers.length > 0 ? ['master'] : ['slave'],
          'Mounted C3 master/slave equipment lacks the complementary role required to form a network.',
        ),
      ],
    };
  }

  if (masterMembers.length > 1) {
    return {
      networks: [],
      denials: [
        createDenial(
          side,
          'multiple-master-units',
          masterMembers.map((member) => member.entityId),
          ['master'],
          'Multiple mounted C3 masters require player-authored slave assignment.',
        ),
      ],
    };
  }

  if (members.length > C3_MASTER_SLAVE_MAX_UNITS) {
    return {
      networks: [],
      denials: [
        createDenial(
          side,
          'oversized-master-slave-network',
          members.map((member) => member.entityId),
          ['master', 'slave'],
          'Mounted C3 master/slave equipment exceeds the maximum automatic network size.',
        ),
      ],
    };
  }

  const network = createC3MasterSlaveNetwork(
    `${side}-c3-master-slave-1`,
    members,
  );
  return network ? { networks: [network], denials: [] } : EMPTY_EVALUATION;
}

function evaluateSelectedFamily(
  side: GameSide,
  roleEntries: readonly RoleEntry[],
): SideEvaluation {
  const families = splitFamilyEntries(roleEntries);
  const populatedFamilies = [
    { entries: families.c3i, evaluate: evaluateC3iFamily },
    { entries: families.nova, evaluate: evaluateNovaFamily },
    { entries: families.standard, evaluate: evaluateStandardFamily },
  ].filter(({ entries }) => entries.length > 0);

  if (populatedFamilies.length === 0) {
    return EMPTY_EVALUATION;
  }

  if (populatedFamilies.length > 1) {
    return {
      networks: [],
      denials: [createMixedFamilyDenial(side, roleEntries)],
    };
  }

  const [family] = populatedFamilies;
  return family.evaluate(side, family.entries);
}

function evaluateSideC3Formation(
  units: Readonly<Record<string, IUnitGameState>>,
  side: GameSide,
): SideEvaluation {
  const roleEntries = collectRoleEntries(units, side);
  const ambiguousDenials = createAmbiguousEquipmentDenials(side, roleEntries);

  if (ambiguousDenials.length > 0) {
    return { networks: [], denials: ambiguousDenials };
  }

  return evaluateSelectedFamily(side, roleEntries);
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

  for (const side of C3_FORMATION_SIDES) {
    const evaluation = evaluateSideC3Formation(units, side);
    denials.push(...evaluation.denials);
    for (const network of evaluation.networks) {
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
