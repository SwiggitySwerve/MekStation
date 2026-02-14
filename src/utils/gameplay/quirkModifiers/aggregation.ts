/**
 * Aggregation functions for quirk modifiers.
 */

import { RangeBracket } from '@/types/gameplay';
import {
  IToHitModifierDetail,
  IAttackerState,
  ITargetState,
} from '@/types/gameplay';
import {
  calculateTargetingQuirkModifier,
  calculateDistractingModifier,
  calculateLowProfileModifier,
} from './targetingQuirks';
import {
  calculateAccurateWeaponModifier,
  calculateInaccurateWeaponModifier,
  calculateStableWeaponModifier,
  getWeaponQuirks,
} from './weaponQuirks';
import {
  calculateSensorGhostsModifier,
  calculateMultiTracModifier,
} from './defensiveQuirks';

/**
 * Calculate all quirk-based to-hit modifiers for an attacker/target pair.
 * This is the main entry point wired into calculateToHit().
 */
export function calculateAttackerQuirkModifiers(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  weaponId?: string,
): readonly IToHitModifierDetail[] {
  const attackerQuirks = attacker.unitQuirks ?? [];
  const targetQuirks = target.unitQuirks ?? [];

  if (attackerQuirks.length === 0 && targetQuirks.length === 0 && !weaponId) {
    return [];
  }

  const modifiers: IToHitModifierDetail[] = [];

  // Targeting quirks (attacker)
  const targetingMod = calculateTargetingQuirkModifier(
    attackerQuirks,
    rangeBracket,
  );
  if (targetingMod) modifiers.push(targetingMod);

  // Sensor Ghosts (attacker penalty)
  const sensorMod = calculateSensorGhostsModifier(attackerQuirks);
  if (sensorMod) modifiers.push(sensorMod);

  // Multi-Trac (attacker)
  if (attacker.secondaryTarget?.isSecondary) {
    const multiTracMod = calculateMultiTracModifier(
      attackerQuirks,
      true,
      attacker.secondaryTarget.inFrontArc,
    );
    if (multiTracMod) modifiers.push(multiTracMod);
  }

  // Distracting (target)
  const distractMod = calculateDistractingModifier(targetQuirks);
  if (distractMod) modifiers.push(distractMod);

  // Low Profile (target — only if not already covered by partial cover)
  const lowProfMod = calculateLowProfileModifier(
    targetQuirks,
    target.partialCover,
  );
  if (lowProfMod) modifiers.push(lowProfMod);

  // Weapon quirks (if weapon ID provided)
  if (weaponId) {
    const wpnQuirks = getWeaponQuirks(attacker.weaponQuirks, weaponId);
    if (wpnQuirks.length > 0) {
      const accurateMod = calculateAccurateWeaponModifier(wpnQuirks);
      if (accurateMod) modifiers.push(accurateMod);

      const inaccurateMod = calculateInaccurateWeaponModifier(wpnQuirks);
      if (inaccurateMod) modifiers.push(inaccurateMod);

      const stableMod = calculateStableWeaponModifier(
        wpnQuirks,
        attacker.movementType,
      );
      if (stableMod) modifiers.push(stableMod);
    }
  }

  return modifiers;
}

/**
 * Check if a unit has a specific quirk.
 */
export function hasQuirk(
  unitQuirks: readonly string[],
  quirkId: string,
): boolean {
  return unitQuirks.includes(quirkId);
}
