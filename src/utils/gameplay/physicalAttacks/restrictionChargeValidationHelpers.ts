import {
  NO_HOVER_CHARGE_OPTION_KEYS,
  blocked,
  canonicalUnitType,
  chargeCapableUnitType,
  explicitNonMekUnitType,
  infantryUnitType,
  knownMekUnitType,
  legacyOrMekUnitType,
  verticalBandsOverlap,
} from './restrictionValidationShared';
import {
  type IPhysicalAttackInput,
  type IPhysicalAttackRestriction,
} from './types';
import { normalizedLamConversionMode } from './unitState';

/** True when any optional-rule string matches an alias set. */
export function optionalRuleEnabled(
  optionalRules: readonly string[] | undefined,
  aliases: ReadonlySet<string>,
): boolean {
  return (
    optionalRules?.some((rule) =>
      aliases.has(
        rule
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_'),
      ),
    ) ?? false
  );
}

/** Normalizes optional-rule labels for set membership checks. */
export function normalizedOptionalRuleKey(rule: string): string {
  return rule.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** No-Hover-Charge optional rule present. */
export function hasNoHoverChargeOptionalRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (optionalRules ?? []).some((rule) =>
    NO_HOVER_CHARGE_OPTION_KEYS.has(normalizedOptionalRuleKey(rule)),
  );
}

/**
 * Movement-mode / LAM conversion cases that forbid charging.
 * WiGE/AirMech and hover/No-Hover-Charge are the catalog anchors.
 */
export function chargeBlockedByMovementMode(
  input: IPhysicalAttackInput,
): boolean {
  const conversionMode = normalizedLamConversionMode(
    input.attackerConversionMode,
  );
  const movementMode = input.attackerMovementMode?.toLowerCase();

  if (conversionMode === 'fighter') return true;
  if (conversionMode === 'airmek' && input.attackerIsAirborneVTOLOrWiGE) {
    return true;
  }

  switch (movementMode) {
    case 'vtol':
      return true;
    case 'wige':
      return !(
        conversionMode === 'airmek' && knownMekUnitType(input.attackerUnitType)
      );
    case 'hover':
      return hasNoHoverChargeOptionalRule(input.optionalRules);
    default:
      return false;
  }
}

/** Attacker unit-type / movement / crew capability for charge. */
export function chargeAttackerCapabilityRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (!chargeCapableUnitType(input.attackerUnitType)) {
    return blocked("This unit type can't charge", 'AttackerCannotCharge');
  }

  if (chargeBlockedByMovementMode(input)) {
    return blocked("This movement mode can't charge", 'AttackerCannotCharge');
  }

  if (input.attackerVehicleCrewStunned === true) {
    return blocked("Stunned vehicle crew can't charge", 'AttackerCannotCharge');
  }

  return undefined;
}

/** Attacker movement-state limits for charge (run, jump, stuck, prone). */
export function chargeAttackerMovementRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (input.attackerStuck) {
    return blocked('Cannot charge while stuck', 'AttackerStuck');
  }

  if (input.attackerJumpedThisTurn) {
    return blocked('No jumping allowed while charging', 'ChargeJumpMovement');
  }

  if (input.attackerRanThisTurn === false) {
    return blocked('Charge requires a run this turn', 'NoRunThisTurn');
  }

  if (input.attackerMovedBackwardThisTurn) {
    return blocked(
      'No backwards movement allowed while charging',
      'ChargeBackwardMovement',
    );
  }

  if (input.attackerProne) {
    return blocked('Cannot charge while prone', 'AttackerProne');
  }

  return undefined;
}

/** Target class limits for charge (Mek-only for Mek attackers, etc.). */
export function chargeTargetClassRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (legacyOrMekUnitType(input.attackerUnitType)) {
    if (input.targetObjectType === 'gunEmplacement') {
      return blocked('Charge target must be a Mek', 'TargetNotMek');
    }
    if (explicitNonMekUnitType(input.targetUnitType)) {
      return blocked('Charge target must be a Mek', 'TargetNotMek');
    }
    if (input.targetProne) {
      return blocked('Charge target must be standing', 'TargetProne');
    }
    return undefined;
  }

  if (
    infantryUnitType(input.targetUnitType) ||
    canonicalUnitType(input.targetUnitType) === 'protomech'
  ) {
    return blocked(
      'Cannot charge Infantry or ProtoMech targets',
      'TargetInfantryOrProtoMek',
    );
  }

  return undefined;
}

/** Target elevation / displacement-state limits for charge. */
export function chargeTargetStateRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (!verticalBandsOverlap(input)) {
    return blocked(
      'Charge target must overlap attacker elevation',
      'ElevationMismatch',
    );
  }

  if (input.targetIsMakingDisplacementAttack) {
    return blocked(
      'Target is already making a charge/DFA attack',
      'TargetMakingDisplacementAttack',
    );
  }

  if (input.targetMovementComplete === false && input.targetImmobile !== true) {
    return blocked(
      'Charge target must be done with movement',
      'TargetMovementIncomplete',
    );
  }

  if (
    input.targetedByDisplacementAttackerId !== undefined &&
    input.targetedByDisplacementAttackerId !== input.attackerId
  ) {
    return blocked(
      'Target is the target of another charge/DFA',
      'TargetOfDisplacementAttack',
    );
  }

  return undefined;
}
