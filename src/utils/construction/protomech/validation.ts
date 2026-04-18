/**
 * ProtoMech Construction Validation Rules (VAL-PROTO-*)
 *
 * Five named rules cover the full construction rule set:
 *   VAL-PROTO-TONNAGE   — tonnage in legal range
 *   VAL-PROTO-CHASSIS   — chassis × tonnage × MP compatibility
 *   VAL-PROTO-MP        — MP ≤ weight-class cap; Ultraheavy cannot jump
 *   VAL-PROTO-MAIN-GUN  — main gun weapon in approved list; arm-weight check
 *   VAL-PROTO-TECH-BASE — tech base is Clan (warning, not error)
 *
 * Each rule returns a ValidationRuleResult so callers can aggregate errors
 * and warnings uniformly.
 *
 * @spec openspec/changes/add-protomech-construction/specs/protomech-unit-system/spec.md
 * @spec openspec/changes/add-protomech-construction/tasks.md §9
 */

import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
} from '@/types/unit/ProtoMechInterfaces';

import { isArmPlacementIllegal, isMainGunWeaponApproved } from './mainGun';
import { getProtoMPCaps, isMyomerBoosterLegal } from './movementCaps';
import {
  getProtoWeightClass,
  isChassisLegalForTonnage,
  PROTO_MAX_TONNAGE,
  PROTO_MIN_TONNAGE,
} from './weightClass';

// =============================================================================
// Result type
// =============================================================================

/** Severity of a validation finding */
export type ValidationSeverity = 'error' | 'warning';

/** Single validation finding */
export interface ValidationFinding {
  ruleId: string;
  severity: ValidationSeverity;
  message: string;
}

/** Result from a single VAL-PROTO-* rule */
export interface ValidationRuleResult {
  ruleId: string;
  passed: boolean;
  findings: ValidationFinding[];
}

// =============================================================================
// Input types
// =============================================================================

/** Minimal build snapshot fed to each validator */
export interface ProtoMechBuildSnapshot {
  tonnage: number;
  chassisType: ProtoChassis;
  /** Base walk MP (before Myomer Booster) */
  walkMP: number;
  jumpMP: number;
  myomerBooster: boolean;
  hasMainGun: boolean;
  /** Equipment ID of the main gun weapon, undefined when no main gun */
  mainGunWeaponId: string | undefined;
  /** All weapon placements to check for arm-weight violations */
  weaponPlacements: Array<{ equipmentId: string; location: ProtoLocation }>;
  /** Tech base string — should be 'Clan' for legal ProtoMechs */
  techBase: string;
}

// =============================================================================
// VAL-PROTO-TONNAGE
// =============================================================================

/** Rule ID constant — exported so test fixtures can reference it */
export const RULE_PROTO_TONNAGE = 'VAL-PROTO-TONNAGE';

/**
 * Validate that tonnage is in the legal range (2–15 t).
 * Ultraheavy tonnage (10–15) is checked against chassis in VAL-PROTO-CHASSIS.
 */
export function validateProtoTonnage(
  snapshot: Pick<ProtoMechBuildSnapshot, 'tonnage'>,
): ValidationRuleResult {
  const { tonnage } = snapshot;
  const findings: ValidationFinding[] = [];

  if (
    !Number.isInteger(tonnage) ||
    tonnage < PROTO_MIN_TONNAGE ||
    tonnage > PROTO_MAX_TONNAGE
  ) {
    findings.push({
      ruleId: RULE_PROTO_TONNAGE,
      severity: 'error',
      message: `Tonnage ${tonnage} is out of the legal range (${PROTO_MIN_TONNAGE}–${PROTO_MAX_TONNAGE} t).`,
    });
  }

  return {
    ruleId: RULE_PROTO_TONNAGE,
    passed: findings.length === 0,
    findings,
  };
}

// =============================================================================
// VAL-PROTO-CHASSIS
// =============================================================================

/** Rule ID constant */
export const RULE_PROTO_CHASSIS = 'VAL-PROTO-CHASSIS';

/**
 * Validate chassis × tonnage × movement compatibility:
 * - Ultraheavy chassis requires tonnage ≥ 10
 * - Glider chassis requires Light class (2–4 tons)
 * - Myomer Booster is only legal on Light or Medium ProtoMechs
 * - Ultraheavy chassis forces jumpMP to 0 (flagged as error if jumpMP > 0)
 */
export function validateProtoChassis(
  snapshot: Pick<
    ProtoMechBuildSnapshot,
    'tonnage' | 'chassisType' | 'jumpMP' | 'myomerBooster'
  >,
): ValidationRuleResult {
  const { tonnage, chassisType, jumpMP, myomerBooster } = snapshot;
  const findings: ValidationFinding[] = [];
  const weightClass = getProtoWeightClass(tonnage);

  if (!isChassisLegalForTonnage(chassisType, tonnage)) {
    if (chassisType === ProtoChassis.ULTRAHEAVY) {
      findings.push({
        ruleId: RULE_PROTO_CHASSIS,
        severity: 'error',
        message: `Ultraheavy chassis requires tonnage ≥ 10 (got ${tonnage} t).`,
      });
    } else if (chassisType === ProtoChassis.GLIDER) {
      findings.push({
        ruleId: RULE_PROTO_CHASSIS,
        severity: 'error',
        message: `Glider chassis is only legal for Light class (2–4 t); got ${tonnage} t.`,
      });
    }
  }

  // Ultraheavy cannot jump
  if (chassisType === ProtoChassis.ULTRAHEAVY && jumpMP > 0) {
    findings.push({
      ruleId: RULE_PROTO_CHASSIS,
      severity: 'error',
      message: `Ultraheavy chassis cannot have jump MP (got ${jumpMP}).`,
    });
  }

  // Myomer Booster legality
  if (myomerBooster && !isMyomerBoosterLegal(weightClass)) {
    findings.push({
      ruleId: RULE_PROTO_CHASSIS,
      severity: 'error',
      message: `Myomer Booster is only legal on Light or Medium ProtoMechs (current class: ${weightClass}).`,
    });
  }

  return {
    ruleId: RULE_PROTO_CHASSIS,
    passed: findings.length === 0,
    findings,
  };
}

// =============================================================================
// VAL-PROTO-MP
// =============================================================================

/** Rule ID constant */
export const RULE_PROTO_MP = 'VAL-PROTO-MP';

/**
 * Validate that walk MP and jump MP do not exceed the weight-class caps.
 * Note: this checks the BASE walk MP (before booster), because the booster
 * bonus is additive and validated separately under VAL-PROTO-CHASSIS.
 */
export function validateProtoMP(
  snapshot: Pick<
    ProtoMechBuildSnapshot,
    'tonnage' | 'walkMP' | 'jumpMP' | 'chassisType'
  >,
): ValidationRuleResult {
  const { tonnage, walkMP, jumpMP, chassisType } = snapshot;
  const findings: ValidationFinding[] = [];
  const weightClass = getProtoWeightClass(tonnage);
  const caps = getProtoMPCaps(weightClass);

  if (walkMP > caps.walkMax) {
    findings.push({
      ruleId: RULE_PROTO_MP,
      severity: 'error',
      message: `Walk MP ${walkMP} exceeds ${weightClass} class cap of ${caps.walkMax}.`,
    });
  }

  if (walkMP < 1) {
    findings.push({
      ruleId: RULE_PROTO_MP,
      severity: 'error',
      message: `Walk MP must be at least 1 (got ${walkMP}).`,
    });
  }

  if (jumpMP > caps.jumpMax) {
    if (chassisType === ProtoChassis.ULTRAHEAVY) {
      findings.push({
        ruleId: RULE_PROTO_MP,
        severity: 'error',
        message: `Ultraheavy cannot jump (jump MP must be 0, got ${jumpMP}).`,
      });
    } else {
      findings.push({
        ruleId: RULE_PROTO_MP,
        severity: 'error',
        message: `Jump MP ${jumpMP} exceeds ${weightClass} class cap of ${caps.jumpMax}.`,
      });
    }
  }

  return { ruleId: RULE_PROTO_MP, passed: findings.length === 0, findings };
}

// =============================================================================
// VAL-PROTO-MAIN-GUN
// =============================================================================

/** Rule ID constant */
export const RULE_PROTO_MAIN_GUN = 'VAL-PROTO-MAIN-GUN';

/**
 * Validate main gun configuration:
 * - When hasMainGun is true, mainGunWeaponId must be in the approved list
 * - No heavy weapon may be placed in an arm mount
 */
export function validateProtoMainGun(
  snapshot: Pick<
    ProtoMechBuildSnapshot,
    'hasMainGun' | 'mainGunWeaponId' | 'weaponPlacements'
  >,
): ValidationRuleResult {
  const { hasMainGun, mainGunWeaponId, weaponPlacements } = snapshot;
  const findings: ValidationFinding[] = [];

  // Main gun weapon must be from the approved list
  if (hasMainGun) {
    if (!mainGunWeaponId) {
      findings.push({
        ruleId: RULE_PROTO_MAIN_GUN,
        severity: 'error',
        message:
          'Main gun is enabled but no weapon has been assigned to the MainGun location.',
      });
    } else if (!isMainGunWeaponApproved(mainGunWeaponId)) {
      findings.push({
        ruleId: RULE_PROTO_MAIN_GUN,
        severity: 'error',
        message: `Weapon "${mainGunWeaponId}" is not in the approved main-gun list.`,
      });
    }
  }

  // Arm placement check — heavy weapons must not be in arm mounts
  for (const { equipmentId, location } of weaponPlacements) {
    if (isArmPlacementIllegal(equipmentId, location)) {
      findings.push({
        ruleId: RULE_PROTO_MAIN_GUN,
        severity: 'error',
        message: `Weapon "${equipmentId}" is too heavy for arm mount "${location}"; it must be placed in the MainGun location.`,
      });
    }
  }

  return {
    ruleId: RULE_PROTO_MAIN_GUN,
    passed: findings.length === 0,
    findings,
  };
}

// =============================================================================
// VAL-PROTO-TECH-BASE
// =============================================================================

/** Rule ID constant */
export const RULE_PROTO_TECH_BASE = 'VAL-PROTO-TECH-BASE';

/**
 * Warn (not error) when tech base is not Clan.
 * Inner Sphere ProtoMechs do not exist in canon.
 */
export function validateProtoTechBase(
  snapshot: Pick<ProtoMechBuildSnapshot, 'techBase'>,
): ValidationRuleResult {
  const { techBase } = snapshot;
  const findings: ValidationFinding[] = [];

  if (techBase !== 'Clan') {
    findings.push({
      ruleId: RULE_PROTO_TECH_BASE,
      severity: 'warning',
      message: `ProtoMechs are Clan-only technology (tech base is "${techBase}").`,
    });
  }

  return {
    ruleId: RULE_PROTO_TECH_BASE,
    passed: findings.length === 0,
    findings,
  };
}

// =============================================================================
// Aggregate validator
// =============================================================================

/**
 * All registered VAL-PROTO-* rule IDs.
 * Used by the validation registry to assert that all rules are present.
 */
export const PROTO_VALIDATION_RULE_IDS = [
  RULE_PROTO_TONNAGE,
  RULE_PROTO_CHASSIS,
  RULE_PROTO_MP,
  RULE_PROTO_MAIN_GUN,
  RULE_PROTO_TECH_BASE,
] as const;

export type ProtoValidationRuleId = (typeof PROTO_VALIDATION_RULE_IDS)[number];

/** Aggregated result across all VAL-PROTO-* rules */
export interface ProtoMechValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  findings: ValidationFinding[];
  ruleResults: ValidationRuleResult[];
}

/**
 * Run all VAL-PROTO-* rules against a build snapshot and return an
 * aggregated result. Errors make isValid false; warnings do not.
 */
export function validateProtoMech(
  snapshot: ProtoMechBuildSnapshot,
): ProtoMechValidationResult {
  const ruleResults: ValidationRuleResult[] = [
    validateProtoTonnage(snapshot),
    validateProtoChassis(snapshot),
    validateProtoMP(snapshot),
    validateProtoMainGun(snapshot),
    validateProtoTechBase(snapshot),
  ];

  const findings = ruleResults.flatMap((r) => r.findings);
  const isValid = findings.every((f) => f.severity !== 'error');
  const hasWarnings = findings.some((f) => f.severity === 'warning');

  return { isValid, hasWarnings, findings, ruleResults };
}
