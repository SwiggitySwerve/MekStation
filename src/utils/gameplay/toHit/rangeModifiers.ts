import { RangeBracket } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';

import { RANGE_MODIFIERS } from './constants';

export function calculateRangeModifier(
  range: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
  extremeRange?: number,
): IToHitModifierDetail {
  let bracket: RangeBracket;
  let value: number;

  if (range <= shortRange) {
    bracket = RangeBracket.Short;
    value = RANGE_MODIFIERS[RangeBracket.Short];
  } else if (range <= mediumRange) {
    bracket = RangeBracket.Medium;
    value = RANGE_MODIFIERS[RangeBracket.Medium];
  } else if (range <= longRange) {
    bracket = RangeBracket.Long;
    value = RANGE_MODIFIERS[RangeBracket.Long];
  } else if (extremeRange !== undefined && range <= extremeRange) {
    bracket = RangeBracket.Extreme;
    value = RANGE_MODIFIERS[RangeBracket.Extreme];
  } else {
    bracket = RangeBracket.OutOfRange;
    value = Infinity;
  }

  return {
    name: `Range (${bracket})`,
    value,
    source: 'range',
    description: `Target at ${range} hexes: ${bracket} range`,
  };
}

export function getRangeModifierForBracket(
  bracket: RangeBracket,
): IToHitModifierDetail {
  return {
    name: `Range (${bracket})`,
    value: RANGE_MODIFIERS[bracket],
    source: 'range',
    description: `${bracket} range modifier`,
  };
}

export function calculateMinimumRangeModifier(
  range: number,
  minRange: number,
): IToHitModifierDetail | null {
  if (minRange <= 0 || range >= minRange) {
    return null;
  }

  const penalty = minRange - range;
  return {
    name: 'Minimum Range',
    value: penalty,
    source: 'range',
    description: `Target inside minimum range (${minRange}): +${penalty}`,
  };
}

export function getRangeBracket(
  range: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
  extremeRange?: number,
): RangeBracket {
  if (range <= shortRange) return RangeBracket.Short;
  if (range <= mediumRange) return RangeBracket.Medium;
  if (range <= longRange) return RangeBracket.Long;
  if (extremeRange !== undefined && range <= extremeRange) {
    return RangeBracket.Extreme;
  }
  return RangeBracket.OutOfRange;
}
