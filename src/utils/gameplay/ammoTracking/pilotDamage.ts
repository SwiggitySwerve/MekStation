import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import type { CASEProtectionLevel } from './types';

export const BATTLEMECH_AMMO_EXPLOSION_PILOT_DAMAGE = 2;
export const REDUCED_CASE_AMMO_EXPLOSION_PILOT_DAMAGE = 1;

export interface IResolveBattleMechAmmoExplosionPilotDamageOptions {
  readonly totalDamage: number;
  readonly pilotAbilities?: readonly string[];
  readonly caseProtection?: CASEProtectionLevel;
  readonly advancedCasePilotDamage?: boolean;
}

function hasSourceBackedIronMan(abilities: readonly string[]): boolean {
  return abilities.includes('iron_man') || abilities.includes('iron-man');
}

function hasSourceBackedPainResistance(abilities: readonly string[]): boolean {
  return (
    abilities.includes('pain_resistance') ||
    abilities.includes('pain-resistance')
  );
}

export function resolveBattleMechAmmoExplosionPilotDamage(
  options: IResolveBattleMechAmmoExplosionPilotDamageOptions,
): number {
  if (options.totalDamage <= 0) {
    return 0;
  }

  const pilotAbilities = options.pilotAbilities ?? [];
  if (hasSPA(pilotAbilities, 'artificial_pain_shunt')) {
    return 0;
  }

  let damage = BATTLEMECH_AMMO_EXPLOSION_PILOT_DAMAGE;
  if (
    options.advancedCasePilotDamage === true &&
    options.caseProtection !== undefined &&
    options.caseProtection !== 'none'
  ) {
    damage = REDUCED_CASE_AMMO_EXPLOSION_PILOT_DAMAGE;
  }

  if (
    hasSourceBackedPainResistance(pilotAbilities) ||
    hasSourceBackedIronMan(pilotAbilities)
  ) {
    damage -= 1;
  }

  return Math.max(0, damage);
}
