import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import { FiringArc, IGameState, IToHitModifier } from '@/types/gameplay';
import {
  updateC3UnitOperationalStatus,
  updateC3UnitECMStatus,
  updateC3UnitPosition,
  type IC3NetworkUnit,
  type IC3NetworkState,
} from '@/utils/gameplay/c3Network';
import {
  ECM_RADIUS,
  createEmptyEWState,
  resolveC3ECMDisruption,
} from '@/utils/gameplay/electronicWarfare';
import {
  calculateFiringArc,
  getTorsoTwistFromSecondaryFacing,
} from '@/utils/gameplay/firingArc';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { isNarcCompatibleMissileWeapon } from '@/utils/gameplay/specialWeaponMechanics';

import type { IWeapon } from '../../ai/types';

import { hasINarcPodType } from './weaponAttackDesignatorMarkers';

const PLAYTEST_3_C3_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest-3',
  'playtest3',
]);

export function hasPlaytest3C3SpotterLineOfSightRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_C3_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
  );
}

export function isTargetInAttackerFrontArc(
  state: IGameState,
  attackerId: string,
  targetId: string,
): boolean {
  const attacker = state.units[attackerId];
  const target = state.units[targetId];
  if (!attacker || !target) return false;

  return (
    calculateFiringArc(
      target.position,
      attacker.position,
      attacker.facing,
      attacker.torsoTwist ??
        getTorsoTwistFromSecondaryFacing(
          attacker.facing,
          attacker.secondaryFacing,
        ),
    ) === FiringArc.Front
  );
}

export function isAttackerStealthArmorActive(
  attacker: IGameState['units'][string],
  state: IGameState,
): boolean {
  if (
    attacker.hasStealthArmor !== true ||
    attacker.shutdown === true ||
    !state.electronicWarfare
  ) {
    return false;
  }

  return state.electronicWarfare.ecmSuites.some(
    (suite) =>
      suite.teamId === attacker.side &&
      suite.mode === 'ecm' &&
      suite.operational &&
      (suite.entityId === attacker.id ||
        suite.entityId.startsWith(`${attacker.id}:`)) &&
      hexDistance(attacker.position, suite.position) <= ECM_RADIUS,
  );
}

export function iNarcHomingToHitModifier(options: {
  attackerTeamId?: string;
  targetINarcedBy: readonly string[];
  targetEcmProtected?: boolean;
  weapon: IWeapon;
}): IToHitModifier | null {
  const { attackerTeamId, targetEcmProtected, targetINarcedBy, weapon } =
    options;
  if (attackerTeamId === undefined) return null;
  if (targetEcmProtected === true) return null;
  if (!targetINarcedBy.includes(attackerTeamId)) return null;
  if (
    !isNarcCompatibleMissileWeapon(weapon.id) &&
    !isNarcCompatibleMissileWeapon(weapon.name)
  ) {
    return null;
  }

  return {
    name: 'iNARC Homing',
    value: -1,
    source: 'equipment',
  };
}

export function iNarcHaywireToHitModifier(
  attacker: IGameState['units'][string] | undefined,
): IToHitModifier | null {
  if (!hasINarcPodType(attacker, 'haywire')) return null;

  return {
    name: 'iNARC Haywire',
    value: 1,
    source: 'equipment',
  };
}

export function isFlightPathAffectedByINarcECM(
  attacker: IGameState['units'][string] | undefined,
): boolean {
  return hasINarcPodType(attacker, 'ecm');
}

const C3_CRITICAL_LOCATION_BY_CATALOG_LOCATION: Readonly<
  Record<string, string>
> = {
  HEAD: 'head',
  CENTER_TORSO: 'center_torso',
  LEFT_TORSO: 'left_torso',
  RIGHT_TORSO: 'right_torso',
  LEFT_ARM: 'left_arm',
  RIGHT_ARM: 'right_arm',
  LEFT_LEG: 'left_leg',
  RIGHT_LEG: 'right_leg',
};

export function normalizeC3CriticalText(text: string): string {
  return text
    .replace(/^\d+-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(is|clan|cl)/, '');
}

export function criticalLocationFromC3SourceLocation(
  sourceLocation: string | undefined,
): string | undefined {
  if (!sourceLocation) return undefined;
  const normalized = sourceLocation
    .split(',')[0]
    ?.trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return normalized
    ? C3_CRITICAL_LOCATION_BY_CATALOG_LOCATION[normalized]
    : undefined;
}

export function criticalSlotTextMatchesC3Role(
  role: IC3NetworkUnit['role'],
  componentName: string,
): boolean {
  const normalized = normalizeC3CriticalText(componentName);
  if (role === 'c3i') {
    return normalized.includes('c3i') || normalized.includes('improvedc3');
  }
  return normalized.includes('c3') && normalized.includes(role);
}

export function isC3EquipmentDestroyedByCriticalManifest(
  equipment: NonNullable<IGameState['units'][string]['c3Equipment']>[number],
  manifest: CriticalSlotManifest | undefined,
): boolean {
  if (!manifest) return false;

  const sourceLocation = criticalLocationFromC3SourceLocation(
    equipment.sourceLocation,
  );
  const slotGroups =
    sourceLocation !== undefined
      ? [manifest[sourceLocation] ?? []]
      : Object.values(manifest);
  const sourceEquipment = normalizeC3CriticalText(equipment.sourceEquipmentId);

  return slotGroups.some((slots) =>
    slots.some((slot) => {
      const component = normalizeC3CriticalText(slot.componentName);
      const isMatchingMount =
        component === sourceEquipment ||
        component.includes(sourceEquipment) ||
        sourceEquipment.includes(component) ||
        criticalSlotTextMatchesC3Role(equipment.role, slot.componentName);

      return isMatchingMount && slot.destroyed;
    }),
  );
}

export function hasUsableC3EquipmentForRole(
  unit: IGameState['units'][string],
  role: IC3NetworkUnit['role'],
  manifest: CriticalSlotManifest | undefined,
): boolean {
  const c3Equipment = unit.c3Equipment;
  if (!c3Equipment || c3Equipment.length === 0) return true;

  const roleEquipment = c3Equipment.filter(
    (equipment) => equipment.role === role,
  );
  if (roleEquipment.length === 0) return false;

  return roleEquipment.some(
    (equipment) =>
      !isC3EquipmentDestroyedByCriticalManifest(equipment, manifest),
  );
}

export function canUnitParticipateInC3(
  unit: IGameState['units'][string] | undefined,
  role: IC3NetworkUnit['role'],
  manifest: CriticalSlotManifest | undefined,
): boolean {
  return (
    unit !== undefined &&
    !unit.destroyed &&
    !unit.hasEjected &&
    !unit.hasRetreated &&
    !unit.isWithdrawing &&
    unit.shutdown !== true &&
    unit.isPassenger !== true &&
    hasUsableC3EquipmentForRole(unit, role, manifest)
  );
}

export function pruneInactiveC3Networks(
  state: IC3NetworkState,
): IC3NetworkState {
  return {
    networks: state.networks.filter((network) => {
      const activeMemberCount = network.members.filter(
        (member) => member.operational,
      ).length;
      if (activeMemberCount < 2) return false;

      if (network.type === 'master-slave') {
        return network.members.some(
          (member) => member.role === 'master' && member.operational,
        );
      }

      return true;
    }),
  };
}

export function hydrateC3StateForAttack(
  state: IGameState,
  manifestsByUnit?: ReadonlyMap<string, CriticalSlotManifest>,
): IC3NetworkState | undefined {
  const c3State = state.c3Network;
  if (!c3State) return undefined;

  const members = c3State.networks.flatMap((network) =>
    network.members.map((member) => {
      const unit = state.units[member.entityId];
      const manifest = manifestsByUnit?.get(member.entityId);

      return {
        entityId: member.entityId,
        teamId: member.teamId,
        position: unit?.position ?? member.position,
        operational: canUnitParticipateInC3(unit, member.role, manifest),
        iNarcPods: unit?.iNarcPods,
      };
    }),
  );
  const disruptions = resolveC3ECMDisruption(
    members,
    state.electronicWarfare ?? createEmptyEWState(),
  );

  const hydratedState = members.reduce((hydrated, member) => {
    const positioned = updateC3UnitPosition(
      hydrated,
      member.entityId,
      member.position,
    );
    const operational = updateC3UnitOperationalStatus(
      positioned,
      member.entityId,
      member.operational,
    );

    return updateC3UnitECMStatus(
      operational,
      member.entityId,
      disruptions.get(member.entityId) ?? false,
    );
  }, c3State);

  return pruneInactiveC3Networks(hydratedState);
}
