import type {
  ICombatWeaponRangeOption,
  IGameState,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ILOSInterveningTerrainEffect } from '@/utils/gameplay/lineOfSight';

import { weaponBracketAtDistance } from './combatProjection.targeting';
import { deriveToHitProjection } from './combatProjection.toHit';
import { getTwoD6HitProbability } from './toHit/forecast';

type ToHitProjectionInput = Parameters<typeof deriveToHitProjection>[0];
type ToHitProjection = NonNullable<ReturnType<typeof deriveToHitProjection>>;

function expectedDamageForWeapon(damage: number, toHitNumber: number): number {
  const expectedDamage = damage * (getTwoD6HitProbability(toHitNumber) / 100);
  return Math.round(expectedDamage * 100) / 100;
}

export function withPerWeaponToHitProjections({
  enabled,
  options,
  attacker,
  targetUnitId,
  combatState,
  distance,
  weapons,
  targetPartialCover,
  targetTerrainModifier,
  interveningTerrainEffects,
  indirectFire,
}: {
  readonly enabled: boolean;
  readonly options: readonly ICombatWeaponRangeOption[];
  readonly attacker: IUnitToken;
  readonly targetUnitId?: string;
  readonly combatState?: IGameState | null;
  readonly distance: number;
  readonly weapons: readonly IWeaponStatus[];
  readonly targetPartialCover: boolean;
  readonly targetTerrainModifier: ToHitProjectionInput['targetTerrainModifier'];
  readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
  readonly indirectFire?: ToHitProjectionInput['indirectFire'];
}): readonly ICombatWeaponRangeOption[] {
  if (!enabled) return options;

  const projections = new Map<string, ToHitProjection>();
  for (const weapon of weapons) {
    const projection = deriveToHitProjection({
      attacker,
      targetUnitId,
      combatState,
      rangeBracket: weaponBracketAtDistance(weapon, distance),
      distance,
      weapons: [weapon],
      targetPartialCover,
      targetTerrainModifier,
      interveningTerrainEffects,
      indirectFire,
    });
    if (projection) projections.set(weapon.id, projection);
  }

  return options.map((option) => {
    const projection = projections.get(option.weaponId);
    return projection
      ? {
          ...option,
          toHitNumber: projection.toHitNumber,
          toHitModifiers: projection.toHitModifiers,
          toHitReason: projection.toHitReason,
          expectedDamage: expectedDamageForWeapon(
            option.damage,
            projection.toHitNumber,
          ),
        }
      : option;
  });
}
