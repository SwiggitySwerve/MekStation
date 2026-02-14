/**
 * Targeting and defensive quirk modifiers.
 */

import { RangeBracket } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';
import { UNIT_QUIRK_IDS } from './catalog';

/**
 * Improved Targeting: -1 at specified range bracket.
 * Poor Targeting: +1 at specified range bracket.
 */
export function calculateTargetingQuirkModifier(
  unitQuirks: readonly string[],
  rangeBracket: RangeBracket,
): IToHitModifierDetail | null {
  let modifier = 0;

  // Improved Targeting
  if (
    rangeBracket === RangeBracket.Short &&
    unitQuirks.includes(UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT)
  ) {
    modifier -= 1;
  }
  if (
    rangeBracket === RangeBracket.Medium &&
    unitQuirks.includes(UNIT_QUIRK_IDS.IMPROVED_TARGETING_MEDIUM)
  ) {
    modifier -= 1;
  }
  if (
    rangeBracket === RangeBracket.Long &&
    unitQuirks.includes(UNIT_QUIRK_IDS.IMPROVED_TARGETING_LONG)
  ) {
    modifier -= 1;
  }

  // Poor Targeting
  if (
    rangeBracket === RangeBracket.Short &&
    unitQuirks.includes(UNIT_QUIRK_IDS.POOR_TARGETING_SHORT)
  ) {
    modifier += 1;
  }
  if (
    rangeBracket === RangeBracket.Medium &&
    unitQuirks.includes(UNIT_QUIRK_IDS.POOR_TARGETING_MEDIUM)
  ) {
    modifier += 1;
  }
  if (
    rangeBracket === RangeBracket.Long &&
    unitQuirks.includes(UNIT_QUIRK_IDS.POOR_TARGETING_LONG)
  ) {
    modifier += 1;
  }

  if (modifier === 0) return null;

  const sign = modifier > 0 ? '+' : '';
  return {
    name: modifier < 0 ? 'Improved Targeting' : 'Poor Targeting',
    value: modifier,
    source: 'quirk',
    description: `${modifier < 0 ? 'Improved' : 'Poor'} Targeting (${rangeBracket}): ${sign}${modifier}`,
  };
}

/**
 * Distracting: +1 to-hit for enemies attacking this unit.
 */
export function calculateDistractingModifier(
  targetQuirks: readonly string[],
): IToHitModifierDetail | null {
  if (!targetQuirks.includes(UNIT_QUIRK_IDS.DISTRACTING)) return null;

  return {
    name: 'Distracting',
    value: 1,
    source: 'quirk',
    description: 'Target has Distracting quirk: +1',
  };
}

/**
 * Low Profile: partial cover effect.
 * Returns true if the unit has Low Profile quirk — caller handles as partial cover.
 */
export function hasLowProfile(unitQuirks: readonly string[]): boolean {
  return unitQuirks.includes(UNIT_QUIRK_IDS.LOW_PROFILE);
}

/**
 * Low Profile to-hit modifier: +1 (same as partial cover).
 * Only applies if target doesn't already have partial cover.
 */
export function calculateLowProfileModifier(
  targetQuirks: readonly string[],
  alreadyHasPartialCover: boolean,
): IToHitModifierDetail | null {
  if (!targetQuirks.includes(UNIT_QUIRK_IDS.LOW_PROFILE)) return null;
  if (alreadyHasPartialCover) return null; // Already counted via partial cover

  return {
    name: 'Low Profile',
    value: 1,
    source: 'quirk',
    description: 'Target has Low Profile quirk (partial cover effect): +1',
  };
}
