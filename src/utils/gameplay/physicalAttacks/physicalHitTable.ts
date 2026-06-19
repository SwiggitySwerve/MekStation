import type { IPhysicalAttackInput, PhysicalHitTable } from './types';

import { PHYSICAL_CLUSTER_SIZE } from './constants';
import { SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES } from './types';

export function splitPhysicalDamageIntoClusters(
  totalDamage: number,
): readonly number[] {
  if (totalDamage <= 0) return [];
  const clusters: number[] = [];
  let remaining = totalDamage;
  while (remaining > 0) {
    const size = Math.min(PHYSICAL_CLUSTER_SIZE, remaining);
    clusters.push(size);
    remaining -= size;
  }
  return clusters;
}

const MELEE_WEAPON_ATTACK_TYPE_SET = new Set<string>(
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
);
const MEK_TARGET_TYPES = new Set([
  'battlemech',
  'mek',
  'mech',
  'omnimech',
  'industrialmech',
]);

function representedMekTarget(unitType: string | undefined): boolean {
  const canonical = unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return canonical === undefined || MEK_TARGET_TYPES.has(canonical);
}

export function selectPhysicalHitTable(
  input: IPhysicalAttackInput,
): PhysicalHitTable {
  if (input.hitTableOverride) return input.hitTableOverride;
  if (input.attackType === 'kick') return 'kick';

  if (input.attackType === 'punch') {
    if (!input.attackerHullDown || !input.elevationContext) return 'punch';

    return input.elevationContext.attackerArmElevation >
      input.elevationContext.targetBaseElevation
      ? 'punch'
      : 'kick';
  }

  if (
    MELEE_WEAPON_ATTACK_TYPE_SET.has(input.attackType) &&
    input.attackerHullDown &&
    representedMekTarget(input.targetUnitType)
  ) {
    return 'kick';
  }

  return 'punch';
}
