import { hexDistance } from '@/utils/gameplay/hexMath';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIUnitState, IWeapon } from './types';

export class AttackAI {
  getValidTargets(
    attacker: IAIUnitState,
    allUnits: readonly IAIUnitState[],
  ): readonly IAIUnitState[] {
    if (attacker.weapons.length === 0) {
      return [];
    }

    const maxWeaponRange = Math.max(
      ...attacker.weapons.filter((w) => !w.destroyed).map((w) => w.longRange),
    );

    if (maxWeaponRange === 0 || maxWeaponRange === -Infinity) {
      return [];
    }

    return allUnits.filter((target) => {
      if (target.unitId === attacker.unitId) return false;
      if (target.destroyed) return false;

      const distance = hexDistance(attacker.position, target.position);
      return distance <= maxWeaponRange;
    });
  }

  selectTarget(
    targets: readonly IAIUnitState[],
    random: SeededRandom,
  ): IAIUnitState | null {
    if (targets.length === 0) {
      return null;
    }

    const index = random.nextInt(targets.length);
    return targets[index];
  }

  selectWeapons(
    attacker: IAIUnitState,
    target: IAIUnitState,
  ): readonly IWeapon[] {
    const distance = hexDistance(attacker.position, target.position);

    return attacker.weapons.filter((weapon) => {
      if (weapon.destroyed) return false;
      if (distance > weapon.longRange) return false;

      if (weapon.ammoPerTon > 0) {
        const ammoCount = attacker.ammo[weapon.id];
        if (ammoCount !== undefined && ammoCount <= 0) {
          return false;
        }
      }

      return true;
    });
  }
}
