import { type IUnitGameState, MovementType } from '@/types/gameplay';
import {
  getWeaponCoolingHeatModifier,
  getWeaponQuirks,
} from '@/utils/gameplay/quirkModifiers';

import type { IWeapon } from '../../ai/types';

import {
  JUMP_HEAT,
  MEDIUM_LASER_HEAT,
  RUN_HEAT,
  WALK_HEAT,
} from '../SimulationRunnerConstants';

/**
 * Resolve a per-unit weapon-heat total for the heat phase. When the
 * runner threaded `weaponsByUnit`, each weapon id fired this turn maps to
 * real catalog heat. Without hydration, legacy fixtures keep the synthetic
 * medium-laser fallback.
 */
export function computeWeaponHeat(
  weaponsFired: readonly string[],
  unitWeapons: readonly IWeapon[] | undefined,
  weaponQuirks?: Readonly<Record<string, readonly string[]>>,
): number {
  if (!unitWeapons || unitWeapons.length === 0) {
    return weaponsFired.length * MEDIUM_LASER_HEAT;
  }
  let total = 0;
  for (const weaponId of weaponsFired) {
    const weapon = unitWeapons.find((w) => w.id === weaponId);
    const baseHeat = weapon ? weapon.heat : MEDIUM_LASER_HEAT;
    const quirks = [
      ...getWeaponQuirks(weaponQuirks, weaponId),
      ...getWeaponQuirks(weaponQuirks, weapon?.name ?? ''),
    ];
    total += Math.max(
      0,
      baseHeat + getWeaponCoolingHeatModifier(quirks, baseHeat),
    );
  }
  return total;
}

/**
 * Movement heat per the canonical Total Warfare table: Walk = 1,
 * Run = 2, Jump = max(3, jumped hexes), Stationary = 0.
 */
export function computeMovementHeat(unit: IUnitGameState): number {
  if (unit.movementThisTurn === MovementType.Walk) return WALK_HEAT;
  if (unit.movementThisTurn === MovementType.Run) return RUN_HEAT;
  if (unit.movementThisTurn === MovementType.Jump) {
    return Math.max(JUMP_HEAT, unit.hexesMovedThisTurn);
  }
  return 0;
}
