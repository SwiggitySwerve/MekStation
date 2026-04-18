/**
 * SPA Integration — Combat Modifier Aggregation
 * Combines all SPA modifiers for attacker/target into a single result.
 *
 * Wave 2b — Designation source of truth:
 *   The flat `designated*` fields on `IAttackerState` are now considered
 *   the WIRE format. Upstream callers should populate them from the
 *   pilot record via `populateAttackerDesignations()` (below) which
 *   reads `pilot.abilities[i].designation` through the typed
 *   `ISPADesignation` discriminated union. The modifier functions
 *   themselves continue to read flat fields — this keeps the regression
 *   suite green and contains the change.
 *
 * Phase 5 honour list (designation-aware SPAs wired today):
 *   - Weapon Specialist  (weapon_type)
 *   - Gunnery Specialist (weapon_category)
 *   - Blood Stalker      (target)
 *   - Range Master       (range_bracket)
 *
 * TODO (next wave):
 *   - Sandblaster        (weapon_type damage modifier)
 *   - Human TRO          (weapon_type critical hit shift)
 *   - Environmental Specialist / Terrain Master (terrain)
 *   - Oblique Attacker terrain refinement (currently unconditional)
 */

import type { IPilot } from '@/types/pilot';

import { RangeBracket } from '@/types/gameplay';
import {
  IToHitModifierDetail,
  IAttackerState,
  ITargetState,
} from '@/types/gameplay';
import {
  isRangeBracketDesignation,
  isTargetDesignation,
  isWeaponCategoryDesignation,
  isWeaponTypeDesignation,
} from '@/types/pilot/SPADesignation';

import { calculateBloodStalkerModifier } from './abilityModifiers';
import { calculateMultiTaskerModifier } from './abilityModifiers';
import { calculateJumpingJackModifier } from './abilityModifiers';
import { calculateDodgeManeuverModifier } from './abilityModifiers';
import { calculateWeaponSpecialistModifier } from './weaponSpecialists';
import { calculateGunnerySpecialistModifier } from './weaponSpecialists';
import { calculateRangeMasterModifier } from './weaponSpecialists';
import { calculateSniperModifier } from './weaponSpecialists';

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

// =============================================================================
// Wave 2b — designation hand-off
// =============================================================================

/**
 * Map a pilot's stored designations onto the flat `designated*` fields of
 * `IAttackerState`. Upstream attack-resolution code calls this once per
 * attack to populate the wire format, so the modifier functions can keep
 * reading the flat fields they always have. Source of truth is the typed
 * `pilot.abilities[i].designation` discriminated union — this function
 * is the single place that bridges typed → flat.
 *
 * Mapping:
 *   - Weapon Specialist  → `designatedWeaponType`
 *   - Gunnery Specialist → `designatedWeaponCategory`
 *   - Blood Stalker      → `designatedTargetId` (skips empty/deferred ids)
 *   - Range Master       → `designatedRangeBracket`
 *
 * Other designation kinds (terrain, skill) aren't yet consumed by the
 * combat layer; they're intentionally ignored here. Callers that need
 * them today should reach for `getPilotDesignation()` on `PilotService`.
 */
export function populateAttackerDesignations(
  pilot: Pick<IPilot, 'abilities'>,
  base: IAttackerState,
): IAttackerState {
  let designatedWeaponType: string | undefined;
  let designatedWeaponCategory: string | undefined;
  let designatedTargetId: string | undefined;
  let designatedRangeBracket: RangeBracket | undefined;

  for (const ability of pilot.abilities) {
    const d = ability.designation;
    if (!d) continue;
    if (isWeaponTypeDesignation(d)) {
      // Prefer the displayLabel because the modifier compares against
      // the wire-format weapon name ("PPC", not "ppc"). Fall back to the
      // canonical id when the label is missing.
      designatedWeaponType = d.displayLabel || d.weaponTypeId;
    } else if (isWeaponCategoryDesignation(d)) {
      designatedWeaponCategory = d.category;
    } else if (isTargetDesignation(d)) {
      // Empty unit id (deferred binding) intentionally clears nothing.
      if (d.targetUnitId) designatedTargetId = d.targetUnitId;
    } else if (isRangeBracketDesignation(d)) {
      designatedRangeBracket = d.bracket as RangeBracket;
    }
  }

  // Preserve any caller-supplied overrides — only fill in fields the
  // caller didn't set. This keeps tests that hand-craft an attacker
  // state passing without us clobbering their inputs.
  return {
    ...base,
    designatedWeaponType: base.designatedWeaponType ?? designatedWeaponType,
    designatedWeaponCategory:
      base.designatedWeaponCategory ?? designatedWeaponCategory,
    designatedTargetId: base.designatedTargetId ?? designatedTargetId,
    designatedRangeBracket:
      base.designatedRangeBracket ?? designatedRangeBracket,
  };
}
