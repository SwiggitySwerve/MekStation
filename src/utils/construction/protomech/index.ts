/**
 * ProtoMech Construction — public barrel
 *
 * Re-exports the full construction surface for ProtoMech units.
 * Import from this barrel rather than reaching into sub-modules directly.
 *
 * @spec openspec/changes/add-protomech-construction/tasks.md
 */

// Weight class tables and chassis legality
export {
  getProtoArmorMaxByTonnage,
  getProtoWeightClass,
  isChassisLegalForTonnage,
  PROTO_MAX_TONNAGE,
  PROTO_MAX_STANDARD_TONNAGE,
  PROTO_MIN_TONNAGE,
  PROTO_MIN_ULTRAHEAVY_TONNAGE,
  ProtoWeightClass,
} from './weightClass';

// Movement caps and engine formulas
export {
  computeProtoEngineRating,
  computeProtoEngineWeight,
  computeRunMP,
  effectiveJumpMP,
  effectiveWalkMP,
  getProtoMPCaps,
  isMyomerBoosterLegal,
  PROTO_ENGINE_WEIGHT_FACTOR,
} from './movementCaps';

// Main gun approved list and arm-placement helpers
export {
  getProtoWeaponSizeClass,
  isArmLocation,
  isArmPlacementIllegal,
  isMainGunWeaponApproved,
  PROTO_MAIN_GUN_APPROVED_WEAPON_IDS,
  ProtoWeaponSizeClass,
  requiresMainGunMount,
} from './mainGun';

// Validation rules (VAL-PROTO-*)
export {
  PROTO_VALIDATION_RULE_IDS,
  RULE_PROTO_CHASSIS,
  RULE_PROTO_MAIN_GUN,
  RULE_PROTO_MP,
  RULE_PROTO_TECH_BASE,
  RULE_PROTO_TONNAGE,
  validateProtoChassis,
  validateProtoMainGun,
  validateProtoMech,
  validateProtoMP,
  validateProtoTechBase,
  validateProtoTonnage,
} from './validation';

// Types re-exported for convenience
export type { IProtoMPCaps } from './movementCaps';
export type {
  ProtoMechBuildSnapshot,
  ProtoMechValidationResult,
  ProtoValidationRuleId,
  ValidationFinding,
  ValidationRuleResult,
  ValidationSeverity,
} from './validation';

// Battle Value (BV 2.0) calculator + breakdown types
export {
  calculateProtoMechBV,
  calculateProtoPointBV,
  calculateProtoSpeedFactor,
  getProtoChassisMultiplier,
} from './protoMechBV';
export type { IProtoMechBVBreakdown, IProtoMechBVOptions } from './protoMechBV';
