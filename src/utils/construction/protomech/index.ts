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
  PROTO_ARMOR_CODES,
  PROTO_ARMOR_TYPES,
  getProtoArmorDefinition,
  getProtoArmorName,
  isProtoEDPArmorMount,
  protoArmorContractType,
  setProtoArmorEquipment,
} from './armorType';
export { computeProtoArmorWeight, computeProtoWeight } from './weight';
export { getProtoArmorSlotErrors } from './mainGun';

export {
  getProtoWeightClass,
  isChassisLegalForTonnage,
  PROTO_MAX_TONNAGE,
  PROTO_MAX_STANDARD_TONNAGE,
  PROTO_MIN_TONNAGE,
  ProtoWeightClass,
} from './weightClass';

// The legacy `Ultraheavy` chassis value: one read rule and one fingerprint rule
export {
  legacyProtoChassisLabel,
  readSavedProtoChassis,
} from './legacyUltraheavy';

// Derived movement and engine formulas
export {
  computeProtoEngineRating,
  computeProtoEngineWeight,
  computeProtoWalkMPForRating,
  computeRunMP,
  effectiveJumpMP,
  hasProtoPartialWing,
  protoChassisCanJump,
  getProtoEngineWeightError,
  PROTO_ENGINE_WEIGHT_FACTOR,
  PROTO_MAX_ENGINE_RATING,
} from './movementCaps';

// Editor input limits (MegaMekLab's spinner limits), built on the movement rules owner
export {
  clampProtoMovement,
  protoJumpLimit,
  protoMaxWalkMP,
  protoMinWalkMP,
  protoTonnageChangeError,
} from './movementLimits';
export type { ProtoMovementInput } from './movementLimits';

// Partial Wing jump bonus: the single, pure owner shared with gameplay
export { partialWingJumpBonus } from './partialWing';
export type {
  PartialWingAtmosphere,
  PartialWingJumpContext,
} from './partialWing';

// Movement construction rules of TestProtoMek.correctMovement: the single owner
export {
  getProtoMovementErrors,
  isProtoExtendedJumpJet,
  isProtoUmu,
  protoMaxJumpMP,
  summarizeProtoJumpEquipment,
} from './movementRules';
export type { ProtoMovementFacts } from './movementRules';

// Main Gun and arm placement (pinned slot, weight and weapon-legality rules)
export {
  getProtoLocationSlotLimit,
  getProtoLocationWeightLimit,
  getProtoMainGunTopologyError,
  getProtoMountWeight,
  getProtoPlacementErrors,
  isProtoMechExcludedWeapon,
  isProtoUltraheavyTonnage,
  protoMountTakesSlot,
} from './mainGun';
export type {
  ProtoEquipmentPlacement,
  ProtoPlacementLocation,
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
export { protoMechBVTerms } from './bvTrace';

// Original internal structure and absent-location representation.
export {
  computeProtoStructure,
  getProtoStructureTonnageError,
} from './structure';

// Shared total and location armor limits, allocation and diagnostics.
export {
  allocateProtoArmor,
  computeProtoArmorLimits,
  getProtoArmorErrors,
  getProtoArmorMaxByTonnage,
} from './armor';
