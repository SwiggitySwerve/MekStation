import { IHexCoordinate, RangeBracket } from '@/types/gameplay';
import {
  IAttackerState,
  ITargetState,
  IToHitCalculation,
  IToHitModifierDetail,
} from '@/types/gameplay';

import type { ISemiGuidedTagToHitContext } from './semiGuidedTagModifiers';

import {
  getC3TargetingBenefit,
  type IC3TargetingOptions,
  IC3NetworkState,
  IC3TargetingResult,
  isBetterBracket,
} from '../c3Network';
import { IWeaponRangeProfile } from '../range';
import { calculateToHit, type IEcmContext } from './calculate';

export interface IC3ToHitInput {
  readonly attackerEntityId: string;
  readonly targetPosition: IHexCoordinate;
  readonly weaponRangeProfile: IWeaponRangeProfile;
  readonly c3State: IC3NetworkState;
  readonly attackerEcmDisrupted?: boolean;
  readonly targetingOptions?: IC3TargetingOptions;
}

export interface IC3RangeBracketSelection {
  readonly weaponIndex: number;
  readonly effectiveRangeBracket: RangeBracket;
  readonly c3Result: IC3TargetingResult;
}

export function selectC3RangeBracket({
  attackerEntityId,
  targetPosition,
  weaponRangeProfiles,
  directRangeBracket,
  c3State,
  attackerEcmDisrupted,
}: {
  readonly attackerEntityId: string;
  readonly targetPosition: IHexCoordinate;
  readonly weaponRangeProfiles: readonly IWeaponRangeProfile[];
  readonly directRangeBracket: RangeBracket;
  readonly c3State: IC3NetworkState;
  readonly attackerEcmDisrupted?: boolean;
}): IC3RangeBracketSelection | undefined {
  if (
    directRangeBracket === RangeBracket.Short ||
    directRangeBracket === RangeBracket.OutOfRange
  ) {
    return undefined;
  }

  let bestSelection: IC3RangeBracketSelection | undefined;
  for (
    let weaponIndex = 0;
    weaponIndex < weaponRangeProfiles.length;
    weaponIndex += 1
  ) {
    const weaponRangeProfile = weaponRangeProfiles[weaponIndex];
    if (!weaponRangeProfile) continue;
    const c3Result = getC3TargetingBenefit(
      attackerEntityId,
      targetPosition,
      weaponRangeProfile,
      c3State,
      attackerEcmDisrupted,
    );
    if (!c3Result.benefitApplied) continue;
    if (!isBetterBracket(c3Result.bestBracket, directRangeBracket)) continue;
    if (
      bestSelection &&
      !isBetterBracket(
        c3Result.bestBracket,
        bestSelection.effectiveRangeBracket,
      )
    ) {
      continue;
    }

    bestSelection = {
      weaponIndex,
      effectiveRangeBracket: c3Result.bestBracket,
      c3Result,
    };
  }

  return bestSelection;
}

export function calculateToHitWithC3(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  range: number,
  c3Input: IC3ToHitInput,
  minRange: number = 0,
  weaponIdOrEcmContext?: string | IEcmContext,
  semiGuidedTagContext?: ISemiGuidedTagToHitContext,
): IToHitCalculation & { readonly c3Result: IC3TargetingResult } {
  const c3Result = getC3TargetingBenefit(
    c3Input.attackerEntityId,
    c3Input.targetPosition,
    c3Input.weaponRangeProfile,
    c3Input.c3State,
    c3Input.attackerEcmDisrupted,
    c3Input.targetingOptions,
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
    weaponIdOrEcmContext,
    semiGuidedTagContext,
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
