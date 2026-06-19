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
 *   - Environmental Specialist (represented fog/snow/rain/wind terrain/environment slices)
 *
 * Follow-up notes:
 *   - Sandblaster        (weapon_type damage modifier; cluster path consumes
 *                         `designatedWeaponType` outside to-hit aggregation)
 *   - Human TRO          (weapon_type critical hit shift)
 *   - Terrain Master and remaining Environmental Specialist variants (terrain)
 *   - Oblique Attacker terrain refinement (currently unconditional)
 */

import type { IPilot, IPilotAbilityRef } from '@/types/pilot';

import { RangeBracket } from '@/types/gameplay';
import {
  IToHitModifierDetail,
  IAttackerState,
  ITargetState,
} from '@/types/gameplay';
import {
  isRangeBracketDesignation,
  isTargetDesignation,
  isTerrainDesignation,
  isWeaponCategoryDesignation,
  isWeaponTypeDesignation,
} from '@/types/pilot/SPADesignation';

import { calculateBloodStalkerModifier } from './abilityModifiers';
import { calculateMultiTaskerModifier } from './abilityModifiers';
import { calculateJumpingJackModifier } from './abilityModifiers';
import { calculateDodgeManeuverModifier } from './abilityModifiers';
import { calculateShakyStickModifier } from './abilityModifiers';
import { calculateTerrainMasterDefensiveToHitModifier } from './abilityModifiers';
import { calculateVdniRangedToHitModifier } from './abilityModifiers';
import { hasSPA } from './canonicalize';
import { calculateWeaponSpecialistModifier } from './weaponSpecialists';
import { calculateGunnerySpecialistModifier } from './weaponSpecialists';
import { calculateRangeMasterModifier } from './weaponSpecialists';
import { calculateSniperModifier } from './weaponSpecialists';

interface IAttackerDesignationFields {
  designatedWeaponType?: string;
  designatedWeaponCategory?: string;
  designatedTargetId?: string;
  designatedRangeBracket?: RangeBracket;
  designatedEnvironment?: string;
}

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
    target.unitType,
  );
  if (dodgeMod) modifiers.push(dodgeMod);

  const terrainMasterDefensiveMod =
    calculateTerrainMasterDefensiveToHitModifier(
      targetAbilities,
      target.movementType,
      target.terrainFeatures ?? [],
    );
  if (terrainMasterDefensiveMod) modifiers.push(terrainMasterDefensiveMod);

  const shakyStickMod = calculateShakyStickModifier(
    targetAbilities,
    target.isAirborne,
    attacker.isAirborne,
  );
  if (shakyStickMod) modifiers.push(shakyStickMod);

  const vdniMod = calculateVdniRangedToHitModifier(
    attackerAbilities,
    attacker.neuralInterfaceActive ?? true,
  );
  if (vdniMod) modifiers.push(vdniMod);

  return modifiers;
}

function collectAttackerDesignations(
  abilities: readonly IPilotAbilityRef[],
): IAttackerDesignationFields {
  const designations: IAttackerDesignationFields = {};

  for (const ability of abilities) {
    applyAttackerDesignation(ability, designations);
  }

  return designations;
}

function applyAttackerDesignation(
  ability: IPilotAbilityRef,
  designations: IAttackerDesignationFields,
): void {
  const designation = ability.designation;
  if (!designation) return;

  if (isWeaponTypeDesignation(designation)) {
    designations.designatedWeaponType =
      designation.displayLabel || designation.weaponTypeId;
    return;
  }

  if (isWeaponCategoryDesignation(designation)) {
    designations.designatedWeaponCategory = designation.category;
    return;
  }

  if (isTargetDesignation(designation)) {
    if (designation.targetUnitId) {
      designations.designatedTargetId = designation.targetUnitId;
    }
    return;
  }

  if (isRangeBracketDesignation(designation)) {
    designations.designatedRangeBracket = designation.bracket as RangeBracket;
    return;
  }

  if (!isTerrainDesignation(designation)) return;
  if (!hasSPA([ability.abilityId], 'env_specialist')) return;

  designations.designatedEnvironment = designation.terrainTypeId;
}

function mergeAttackerDesignations(
  base: IAttackerState,
  designations: IAttackerDesignationFields,
): IAttackerState {
  return {
    ...base,
    designatedWeaponType:
      base.designatedWeaponType ?? designations.designatedWeaponType,
    designatedWeaponCategory:
      base.designatedWeaponCategory ?? designations.designatedWeaponCategory,
    designatedTargetId:
      base.designatedTargetId ?? designations.designatedTargetId,
    designatedRangeBracket:
      base.designatedRangeBracket ?? designations.designatedRangeBracket,
    designatedEnvironment:
      base.designatedEnvironment ?? designations.designatedEnvironment,
  };
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
 *   - Environmental Specialist → `designatedEnvironment`
 *
 * Non-env-specialist terrain and skill designation kinds aren't yet consumed
 * by the combat layer; they're intentionally ignored here. Callers that need
 * them today should reach for `getPilotDesignation()` on `PilotService`.
 */
export function populateAttackerDesignations(
  pilot: Pick<IPilot, 'abilities'>,
  base: IAttackerState,
): IAttackerState {
  // Preserve any caller-supplied overrides — only fill in fields the
  // caller didn't set. This keeps tests that hand-craft an attacker
  // state passing without us clobbering their inputs.
  return mergeAttackerDesignations(
    base,
    collectAttackerDesignations(pilot.abilities),
  );
}
