/**
 * SPA Integration — Combat Modifier Aggregation
 * Combines all SPA modifiers for attacker/target into a single result.
 */

import { RangeBracket } from '@/types/gameplay';
import { IToHitModifierDetail, IAttackerState, ITargetState } from '@/types/gameplay';
import { calculateWeaponSpecialistModifier } from './weaponSpecialists';
import { calculateGunnerySpecialistModifier } from './weaponSpecialists';
import { calculateRangeMasterModifier } from './weaponSpecialists';
import { calculateSniperModifier } from './weaponSpecialists';
import { calculateBloodStalkerModifier } from './abilityModifiers';
import { calculateMultiTaskerModifier } from './abilityModifiers';
import { calculateJumpingJackModifier } from './abilityModifiers';
import { calculateDodgeManeuverModifier } from './abilityModifiers';

export function calculateAttackerSPAModifiers(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  currentRangeModifier: number,
): readonly IToHitModifierDetail[] {
  const attackerAbilities = attacker.abilities ?? [];
  const targetAbilities = target.abilities ?? [];

  if (attackerAbilities.length === 0 && targetAbilities.length === 0) {
    return [];
  }

  const modifiers: IToHitModifierDetail[] = [];

  // Weapon Specialist
  const weaponSpecMod = calculateWeaponSpecialistModifier(
    attackerAbilities,
    attacker.weaponType,
    attacker.designatedWeaponType,
  );
  if (weaponSpecMod) modifiers.push(weaponSpecMod);

  // Gunnery Specialist
  const gunnSpecMod = calculateGunnerySpecialistModifier(
    attackerAbilities,
    attacker.weaponCategory,
    attacker.designatedWeaponCategory,
  );
  if (gunnSpecMod) modifiers.push(gunnSpecMod);

  // Blood Stalker
  const bloodMod = calculateBloodStalkerModifier(
    attackerAbilities,
    attacker.targetId,
    attacker.designatedTargetId,
  );
  if (bloodMod) modifiers.push(bloodMod);

  // Range Master
  const rangeMasterMod = calculateRangeMasterModifier(
    attackerAbilities,
    rangeBracket,
    attacker.designatedRangeBracket,
    currentRangeModifier,
  );
  if (rangeMasterMod) {
    modifiers.push(rangeMasterMod);
  } else {
    // Sniper (only if Range Master didn't fire)
    const sniperMod = calculateSniperModifier(
      attackerAbilities,
      currentRangeModifier,
    );
    if (sniperMod) modifiers.push(sniperMod);
  }

  // Multi-Tasker
  if (attacker.secondaryTarget?.isSecondary) {
    const multiMod = calculateMultiTaskerModifier(attackerAbilities, true);
    if (multiMod) modifiers.push(multiMod);
  }

  // Jumping Jack
  const jumpMod = calculateJumpingJackModifier(
    attackerAbilities,
    attacker.movementType,
  );
  if (jumpMod) modifiers.push(jumpMod);

  const dodgeMod = calculateDodgeManeuverModifier(
    targetAbilities,
    target.isDodging,
  );
  if (dodgeMod) modifiers.push(dodgeMod);

  return modifiers;
}
