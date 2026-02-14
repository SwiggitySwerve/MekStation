import { MovementType, RangeBracket } from '@/types/gameplay';
import { IToHitCalculation, IToHitModifierDetail } from '@/types/gameplay';

import { createBaseModifier } from './baseModifier';
import { PROBABILITY_TABLE } from './constants';
import { calculateHeatModifier } from './environmentModifiers';
import {
  calculateAttackerMovementModifier,
  calculateTMM,
} from './movementModifiers';
import { getRangeModifierForBracket } from './rangeModifiers';

export function aggregateModifiers(
  modifiers: readonly IToHitModifierDetail[],
): IToHitCalculation {
  const totalModifier = modifiers.reduce((sum, modifier) => {
    return sum + modifier.value;
  }, 0);

  const finalToHit = Math.min(totalModifier, 13);
  const impossible = finalToHit > 12;
  const probability = impossible ? 0 : getProbability(finalToHit);

  return {
    baseToHit: modifiers[0]?.value ?? 0,
    modifiers,
    finalToHit,
    impossible,
    probability,
  };
}

export function getProbability(target: number): number {
  if (target <= 2) return 1.0;
  if (target > 12) return 0;
  return PROBABILITY_TABLE[target] ?? 0;
}

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

export function formatToHitBreakdown(calc: IToHitCalculation): string {
  const lines = calc.modifiers.map((modifier) => {
    const sign = modifier.value >= 0 ? '+' : '';
    return `  ${modifier.name}: ${sign}${modifier.value}`;
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
