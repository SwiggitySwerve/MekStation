/**
 * Facade for physical-attack restriction validation helpers.
 * Implementation lives in concern-scoped modules; keep this path stable for importers.
 */
export {
  chargeAttackerCapabilityRestriction,
  chargeAttackerMovementRestriction,
  chargeBlockedByMovementMode,
  chargeTargetClassRestriction,
  chargeTargetStateRestriction,
  hasNoHoverChargeOptionalRule,
  normalizedOptionalRuleKey,
  optionalRuleEnabled,
} from './restrictionChargeValidationHelpers';
export {
  actuatorDestroyedAt,
  anyKickLegDestroyed,
  anyPunchArmDestroyed,
  attackerHasWorkingThrashArmOrLeg,
  attackerLocationDestroyed,
  bothArmsCarryingCargo,
  eitherArmCarryingCargo,
  eitherZweihanderHandActuatorDestroyed,
  grappleSelectsLeft,
  grappleSelectsRight,
  selectedArmActuatorDestroyed,
  selectedArmCarryingCargo,
  selectedArmLocation,
  selectedBrushOffArm,
  selectedBrushOffArmMissing,
  selectedGrappleSide,
  selectedPunchArmDestroyed,
  zweihanderDeclarationRestriction,
} from './restrictionLimbValidationHelpers';
export {
  meleeWeaponArmRestriction,
  meleeWeaponExtendedRestriction,
  meleeWeaponFrameRestriction,
  meleeWeaponIsArmMounted,
  meleeWeaponNeedsHand,
  meleeWeaponPriorActionRestriction,
} from './restrictionMeleeWeaponValidationHelpers';
export {
  grapplingEnabled,
  jumpJetAttackEnabled,
  mapBreakGrappleInvalidReason,
  mapBrushOffInvalidReason,
  mapGrappleInvalidReason,
  mapJumpJetAttackInvalidReason,
  mapThrashInvalidReason,
  mapTripInvalidReason,
  selectedJumpJetAttackLeg,
  tripAttackEnabled,
  tripLimbUsable,
  tripTargetIsMek,
} from './restrictionTacOpsValidationHelpers';
