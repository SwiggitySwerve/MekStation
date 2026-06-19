import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type { determineArc } from '@/utils/gameplay/firingArcs';

import { RangeBracket } from '@/types/gameplay/HexGridInterfaces';
import { getWeaponRangeBracket } from '@/utils/gameplay/range';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

const ATTACK_RANGE_BRACKET_RANK: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 1,
  [RangeBracket.Long]: 2,
  [RangeBracket.Extreme]: 3,
  [RangeBracket.OutOfRange]: 4,
};

export function bestAttackRangeBracket(
  range: number,
  weaponAttacks: readonly IWeaponAttack[],
): RangeBracket {
  if (weaponAttacks.length === 0) return RangeBracket.Short;

  return weaponAttacks.reduce<RangeBracket>((best, weapon) => {
    const bracket = getWeaponRangeBracket(range, {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      extreme: weapon.extremeRange,
      minimum: weapon.minRange,
    });
    return ATTACK_RANGE_BRACKET_RANK[bracket] < ATTACK_RANGE_BRACKET_RANK[best]
      ? bracket
      : best;
  }, RangeBracket.OutOfRange);
}

export function weaponCoversTargetArc(
  weapon: IWeaponAttack,
  targetArc: ReturnType<typeof determineArc>['arc'],
): boolean {
  return weaponMountCoversTargetArc(weapon, targetArc);
}
