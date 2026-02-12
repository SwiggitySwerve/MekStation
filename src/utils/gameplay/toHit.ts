/**
 * To-Hit Calculation Module
 * Implements BattleTech to-hit modifiers and probability calculations.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import { MovementType, RangeBracket } from '@/types/gameplay';
import {
  IToHitModifierDetail,
  IToHitCalculation,
  IAttackerState,
  ITargetState,
  ICombatContext,
} from '@/types/gameplay';
import {
  TERRAIN_PROPERTIES,
  ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

// =============================================================================
// Constants
// =============================================================================

/**
 * Range modifiers by bracket.
 * Short: +0, Medium: +2, Long: +4
 */
export const RANGE_MODIFIERS: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 2,
  [RangeBracket.Long]: 4,
  [RangeBracket.Extreme]: 6,
  [RangeBracket.OutOfRange]: Infinity, // Cannot hit
};

/**
 * Attacker movement modifiers.
 */
export const ATTACKER_MOVEMENT_MODIFIERS: Readonly<
  Record<MovementType, number>
> = {
  [MovementType.Stationary]: 0,
  [MovementType.Walk]: 1,
  [MovementType.Run]: 2,
  [MovementType.Jump]: 3,
};

import { HEAT_TO_HIT_TABLE } from '@/constants/heat';

/**
 * Re-export for backward compatibility — use HEAT_TO_HIT_TABLE from constants/heat.ts directly.
 * @deprecated Use HEAT_TO_HIT_TABLE from '@/constants/heat' instead.
 */
export const HEAT_THRESHOLDS = HEAT_TO_HIT_TABLE;

/**
 * 2d6 probability table: P(roll >= target)
 */
export const PROBABILITY_TABLE: Readonly<Record<number, number>> = {
  2: 1.0, // 36/36
  3: 35 / 36, // 35/36
  4: 33 / 36, // 33/36
  5: 30 / 36, // 30/36
  6: 26 / 36, // 26/36
  7: 21 / 36, // 21/36
  8: 15 / 36, // 15/36
  9: 10 / 36, // 10/36
  10: 6 / 36, // 6/36
  11: 3 / 36, // 3/36
  12: 1 / 36, // 1/36
  13: 0, // Impossible
};

// =============================================================================
// Modifier Calculation Functions
// =============================================================================

/**
 * Create a base to-hit modifier (gunnery skill).
 */
export function createBaseModifier(gunnery: number): IToHitModifierDetail {
  return {
    name: 'Gunnery Skill',
    value: gunnery,
    source: 'base',
    description: `Pilot gunnery skill: ${gunnery}`,
  };
}

/**
 * Calculate range modifier.
 */
export function calculateRangeModifier(
  range: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
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

/**
 * Calculate range modifier from bracket.
 */
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

/**
 * Calculate attacker movement modifier.
 */
export function calculateAttackerMovementModifier(
  movementType: MovementType,
): IToHitModifierDetail {
  const value = ATTACKER_MOVEMENT_MODIFIERS[movementType];

  return {
    name: 'Attacker Movement',
    value,
    source: 'attacker_movement',
    description: `Attacker ${movementType}: +${value}`,
  };
}

/**
 * TMM bracket table per TotalWarfare/MegaMek canonical values.
 * Hexes moved → base TMM before jump bonus.
 */
const TMM_BRACKETS: readonly { min: number; max: number; tmm: number }[] = [
  { min: 0, max: 2, tmm: 0 },
  { min: 3, max: 4, tmm: 1 },
  { min: 5, max: 6, tmm: 2 },
  { min: 7, max: 9, tmm: 3 },
  { min: 10, max: 17, tmm: 4 },
  { min: 18, max: 24, tmm: 5 },
  { min: 25, max: Infinity, tmm: 6 },
];

/**
 * Calculate Target Movement Modifier (TMM).
 * Uses canonical bracket table instead of ceil(hexesMoved/5).
 * Additional +1 if target jumped.
 */
export function calculateTMM(
  movementType: MovementType,
  hexesMoved: number,
): IToHitModifierDetail {
  if (movementType === MovementType.Stationary || hexesMoved === 0) {
    return {
      name: 'Target Movement (TMM)',
      value: 0,
      source: 'target_movement',
      description: 'Target is stationary',
    };
  }

  // Base TMM from canonical bracket table
  let tmm =
    TMM_BRACKETS.find((b) => hexesMoved >= b.min && hexesMoved <= b.max)?.tmm ??
    0;

  // Additional +1 for jumping
  if (movementType === MovementType.Jump) {
    tmm += 1;
  }

  return {
    name: 'Target Movement (TMM)',
    value: tmm,
    source: 'target_movement',
    description: `Target moved ${hexesMoved} hexes${movementType === MovementType.Jump ? ' (jumped)' : ''}: +${tmm}`,
  };
}

/**
 * Calculate heat modifier.
 */
export function calculateHeatModifier(heat: number): IToHitModifierDetail {
  const threshold = HEAT_THRESHOLDS.find(
    (t) => heat >= t.minHeat && heat <= t.maxHeat,
  );
  const value = threshold?.modifier ?? 0;

  return {
    name: 'Heat',
    value,
    source: 'heat',
    description: heat === 0 ? 'No heat penalty' : `Heat ${heat}: +${value}`,
  };
}

/**
 * Calculate minimum range penalty.
 * Weapons with minimum range suffer +1 for each hex under minimum.
 */
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

/**
 * Target prone modifier.
 * -2 to hit if target is prone and adjacent (easier), +1 if not adjacent (harder).
 */
export function calculateProneModifier(
  targetProne: boolean,
  range: number,
): IToHitModifierDetail | null {
  if (!targetProne) {
    return null;
  }

  const value = range <= 1 ? -2 : 1;
  return {
    name: 'Target Prone',
    value,
    source: 'other',
    description:
      range <= 1
        ? 'Target prone at close range: -2'
        : 'Target prone at range: +1',
  };
}

/**
 * Target immobile modifier.
 * -4 to hit immobile targets.
 */
export function calculateImmobileModifier(
  immobile: boolean,
): IToHitModifierDetail | null {
  if (!immobile) {
    return null;
  }

  return {
    name: 'Target Immobile',
    value: -4,
    source: 'other',
    description: 'Target is immobile: -4',
  };
}

/**
 * Partial cover modifier.
 * +1 to hit target in partial cover.
 */
export function calculatePartialCoverModifier(
  partialCover: boolean,
): IToHitModifierDetail | null {
  if (!partialCover) {
    return null;
  }

  return {
    name: 'Partial Cover',
    value: 1,
    source: 'terrain',
    description: 'Target in partial cover: +1',
  };
}

/**
 * Calculate to-hit modifier from terrain.
 * @param targetTerrain - Terrain features at target hex
 * @param interveningTerrain - Array of terrain features from intervening hexes
 * @returns Total terrain modifier (positive = harder to hit)
 */
export function getTerrainToHitModifier(
  targetTerrain: readonly ITerrainFeature[],
  interveningTerrain: readonly ITerrainFeature[][],
): number {
  let modifier = 0;

  // Add intervening terrain modifiers
  for (const hexFeatures of interveningTerrain) {
    for (const feature of hexFeatures) {
      modifier += TERRAIN_PROPERTIES[feature.type].toHitInterveningModifier;
    }
  }

  // Add target-in-terrain modifier (use highest if multiple)
  if (targetTerrain.length > 0) {
    let targetModifier =
      TERRAIN_PROPERTIES[targetTerrain[0].type].toHitTargetInModifier;
    for (let i = 1; i < targetTerrain.length; i++) {
      const featureModifier =
        TERRAIN_PROPERTIES[targetTerrain[i].type].toHitTargetInModifier;
      if (featureModifier > targetModifier) {
        targetModifier = featureModifier;
      }
    }
    modifier += targetModifier;
  }

  return modifier;
}

// =============================================================================
// Aggregation Functions
// =============================================================================

/**
 * Calculate complete to-hit number with all modifiers.
 */
export function calculateToHit(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  range: number,
  minRange: number = 0,
): IToHitCalculation {
  const modifiers: IToHitModifierDetail[] = [];

  // Base gunnery
  modifiers.push(createBaseModifier(attacker.gunnery));

  // Range
  modifiers.push(getRangeModifierForBracket(rangeBracket));

  // Minimum range
  const minRangeMod = calculateMinimumRangeModifier(range, minRange);
  if (minRangeMod) modifiers.push(minRangeMod);

  // Attacker movement
  modifiers.push(calculateAttackerMovementModifier(attacker.movementType));

  // Target movement (TMM)
  modifiers.push(calculateTMM(target.movementType, target.hexesMoved));

  // Heat
  modifiers.push(calculateHeatModifier(attacker.heat));

  // Target modifiers
  const proneMod = calculateProneModifier(target.prone, range);
  if (proneMod) modifiers.push(proneMod);

  const immobileMod = calculateImmobileModifier(target.immobile);
  if (immobileMod) modifiers.push(immobileMod);

  const coverMod = calculatePartialCoverModifier(target.partialCover);
  if (coverMod) modifiers.push(coverMod);

  // Add damage modifiers from attacker state
  modifiers.push(...attacker.damageModifiers);

  return aggregateModifiers(modifiers);
}

/**
 * Calculate to-hit from full combat context.
 */
export function calculateToHitFromContext(
  context: ICombatContext,
  minRange: number = 0,
): IToHitCalculation {
  const rangeBracket = getRangeBracket(context.range, 3, 6, 15); // Default ranges
  return calculateToHit(
    context.attacker,
    context.target,
    rangeBracket,
    context.range,
    minRange,
  );
}

/**
 * Aggregate modifiers into final to-hit calculation.
 */
export function aggregateModifiers(
  modifiers: readonly IToHitModifierDetail[],
): IToHitCalculation {
  const totalModifier = modifiers.reduce((sum, mod) => sum + mod.value, 0);

  // Final to-hit capped at 12 (anything higher is impossible)
  const finalToHit = Math.min(totalModifier, 13);
  const impossible = finalToHit > 12;

  // Calculate probability (0 if impossible)
  const probability = impossible ? 0 : getProbability(finalToHit);

  return {
    baseToHit: modifiers[0]?.value ?? 0,
    modifiers,
    finalToHit,
    impossible,
    probability,
  };
}

/**
 * Get probability of rolling >= target on 2d6.
 */
export function getProbability(target: number): number {
  if (target <= 2) return 1.0;
  if (target > 12) return 0;
  return PROBABILITY_TABLE[target] ?? 0;
}

/**
 * Determine range bracket for a given range.
 */
export function getRangeBracket(
  range: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
): RangeBracket {
  if (range <= shortRange) return RangeBracket.Short;
  if (range <= mediumRange) return RangeBracket.Medium;
  if (range <= longRange) return RangeBracket.Long;
  return RangeBracket.OutOfRange;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a simple to-hit calculation (for testing or simple scenarios).
 */
export function simpleToHit(
  gunnery: number,
  rangeBracket: RangeBracket,
  attackerMovement: MovementType = MovementType.Stationary,
  targetMovement: MovementType = MovementType.Stationary,
  hexesMoved: number = 0,
  heat: number = 0,
): IToHitCalculation {
  const modifiers: IToHitModifierDetail[] = [
    createBaseModifier(gunnery),
    getRangeModifierForBracket(rangeBracket),
    calculateAttackerMovementModifier(attackerMovement),
    calculateTMM(targetMovement, hexesMoved),
    calculateHeatModifier(heat),
  ];

  return aggregateModifiers(modifiers);
}

/**
 * Format to-hit calculation for display.
 */
export function formatToHitBreakdown(calc: IToHitCalculation): string {
  const lines = calc.modifiers.map((mod) => {
    const sign = mod.value >= 0 ? '+' : '';
    return `  ${mod.name}: ${sign}${mod.value}`;
  });

  lines.push('  ─────────────');
  lines.push(
    `  Total: ${calc.finalToHit}${calc.impossible ? ' (impossible)' : ''}`,
  );

  if (!calc.impossible) {
    lines.push(`  Probability: ${(calc.probability * 100).toFixed(1)}%`);
  }

  return lines.join('\n');
}
