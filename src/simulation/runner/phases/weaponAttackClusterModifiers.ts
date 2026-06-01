import type { IAmmoSlotState } from '@/types/gameplay';
import type { FiringArc } from '@/types/gameplay';

import {
  calculateClusterModifiers,
  getSandblasterClusterModifier,
} from '@/utils/gameplay/specialWeaponMechanics';

import type { IWeapon } from '../../ai/types';

import { weaponTypeFromMountId } from './weaponAttackHelpers';

export interface IMissileClusterModifierContext {
  readonly attackerTeamId?: string;
  readonly targetNarcedBy?: readonly string[];
  readonly targetINarcedBy?: readonly string[];
  readonly targetEcmProtected?: boolean;
  readonly flightPathEcmAffected?: boolean;
  readonly hasArtemisIV?: boolean;
  readonly hasPrototypeArtemisIV?: boolean;
  readonly hasArtemisV?: boolean;
  readonly isIndirectFire?: boolean;
  readonly attackerStealthActive?: boolean;
  readonly clusterHitterSPA?: boolean;
  readonly sandblasterSPA?: boolean;
  readonly designatedWeaponType?: string;
  readonly attackRange?: number;
  readonly incomingAttackArc?: FiringArc;
  readonly targetWeapons?: readonly IWeapon[];
  readonly targetAmmoState?: Record<string, IAmmoSlotState>;
}

export function sandblasterClusterModifier(
  weapon: IWeapon,
  context: IMissileClusterModifierContext | undefined,
): number {
  return getSandblasterClusterModifier({
    hasSandblaster: context?.sandblasterSPA,
    weaponId: weaponTypeFromMountId(weapon.id),
    weaponName: weapon.name,
    designatedWeaponType: context?.designatedWeaponType,
    range: context?.attackRange,
    shortRange: weapon.shortRange,
    mediumRange: weapon.mediumRange,
  });
}

export function missileClusterModifier(options: {
  readonly weapon: IWeapon;
  readonly context?: IMissileClusterModifierContext;
}): number {
  const { context, weapon } = options;
  const targetNarcedBy = context?.targetNarcedBy ?? [];
  const targetINarcedBy = context?.targetINarcedBy ?? [];
  const attackerTeamId = context?.attackerTeamId;
  const narcedTarget =
    attackerTeamId !== undefined &&
    (targetNarcedBy.includes(attackerTeamId) ||
      targetINarcedBy.includes(attackerTeamId));

  return calculateClusterModifiers(
    weaponTypeFromMountId(weapon.id),
    {
      hasArtemisIV: context?.hasArtemisIV ?? weapon.hasArtemisIV,
      hasPrototypeArtemisIV:
        context?.hasPrototypeArtemisIV ?? weapon.hasPrototypeArtemisIV,
      hasArtemisV: context?.hasArtemisV ?? weapon.hasArtemisV,
    },
    {
      narcedTarget,
      ecmProtected: context?.targetEcmProtected,
      flightPathEcmAffected: context?.flightPathEcmAffected,
      isIndirectFire: context?.isIndirectFire,
      attackerStealthActive: context?.attackerStealthActive,
    },
    context?.clusterHitterSPA ?? false,
    sandblasterClusterModifier(weapon, context),
  ).total;
}
