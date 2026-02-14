import { IHexCoordinate, RangeBracket } from '@/types/gameplay';
import {
  IAttackerState,
  ITargetState,
  IToHitCalculation,
  IToHitModifierDetail,
} from '@/types/gameplay';

import {
  getC3TargetingBenefit,
  IC3NetworkState,
  IC3TargetingResult,
} from '../c3Network';
import { IWeaponRangeProfile } from '../range';
import { calculateToHit } from './calculate';

export interface IC3ToHitInput {
  readonly attackerEntityId: string;
  readonly targetPosition: IHexCoordinate;
  readonly weaponRangeProfile: IWeaponRangeProfile;
  readonly c3State: IC3NetworkState;
  readonly attackerEcmDisrupted?: boolean;
}

export function calculateToHitWithC3(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  range: number,
  c3Input: IC3ToHitInput,
  minRange: number = 0,
): IToHitCalculation & { readonly c3Result: IC3TargetingResult } {
  const c3Result = getC3TargetingBenefit(
    c3Input.attackerEntityId,
    c3Input.targetPosition,
    c3Input.weaponRangeProfile,
    c3Input.c3State,
    c3Input.attackerEcmDisrupted,
  );

  const effectiveBracket = c3Result.benefitApplied
    ? c3Result.bestBracket
    : rangeBracket;

  const baseCalc = calculateToHit(
    attacker,
    target,
    effectiveBracket,
    range,
    minRange,
  );

  if (!c3Result.benefitApplied) {
    return { ...baseCalc, c3Result };
  }

  const c3Modifier: IToHitModifierDetail = {
    name: 'C3 Network',
    value: 0,
    source: 'equipment',
    description: `C3 Network: using ${c3Result.bestBracket} range bracket (spotter at ${c3Result.spotterRange} hexes)`,
  };

  return {
    ...baseCalc,
    modifiers: [...baseCalc.modifiers, c3Modifier],
    c3Result,
  };
}
