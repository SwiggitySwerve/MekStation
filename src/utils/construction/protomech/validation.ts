/**
 * ProtoMech Construction Validation Rules (VAL-PROTO-*)
 *
 * Five named rules preserve the legacy editor build-snapshot contract.
 * Native source checks use getProtoSourceConstructionErrors. Editor rules:
 *   VAL-PROTO-TONNAGE   — tonnage in legal range
 *   VAL-PROTO-CHASSIS   — chassis × tonnage × MP compatibility
 *   VAL-PROTO-MP        — MP ≤ weight-class cap; Ultraheavy cannot jump
 *   VAL-PROTO-MAIN-GUN  — Main Gun and arm slot/weight limits; ProtoMech weapons
 *   VAL-PROTO-TECH-BASE — tech base is Clan (warning, not error)
 *
 * Each rule returns a ValidationRuleResult so callers can aggregate errors
 * and warnings uniformly.
 *
 * @spec openspec/changes/add-protomech-construction/specs/protomech-unit-system/spec.md
 * @spec openspec/changes/add-protomech-construction/tasks.md §9
 */

import type { IProtoMech } from '@/types/unit/PersonnelInterfaces';

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { PROTO_ARMOR_CODES } from './armorType';
import {
  getProtoPlacementErrors,
  getProtoArmorSlotErrors,
  type ProtoEquipmentPlacement,
} from './mainGun';
import {
  computeRunMP,
  getProtoMPCaps,
  isMyomerBoosterLegal,
} from './movementCaps';
import { computeProtoWeight, getProtoMinimumWeight } from './weight';
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
  /** Every mount with its location, for the Main Gun and arm limits */
  equipmentPlacements: readonly ProtoEquipmentPlacement[];
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

/** Native source rules from TestProtoMek.java:246-294,445-467.
 * These differ from the legacy editor's chassis/MP policies below.
 */
export function getProtoSourceConstructionErrors(unit: IProtoMech): string[] {
  const errors = validateProtoTonnage({
    tonnage: unit.weightPerUnit,
  }).findings.map((f) => f.message);
  errors.push(
    ...getProtoArmorSlotErrors(
      unit.weightPerUnit,
      unit.chassisType === ProtoChassis.QUAD,
      unit.armorType,
      unit.equipment,
    ),
  );
  const minimumWeight =
    unit.armorType === PROTO_ARMOR_CODES.ELECTRIC_DISCHARGE
      ? (computeProtoWeight(unit).total ?? getProtoMinimumWeight(unit))
      : getProtoMinimumWeight(unit);
  if (minimumWeight !== undefined && minimumWeight > unit.weightPerUnit) {
    errors.push(
      `Weight: ${(minimumWeight * 1000).toFixed(1)} kg is greater than ${(unit.weightPerUnit * 1000).toFixed(1)} kg`,
    );
  }
  if (
    unit.chassisType === ProtoChassis.GLIDER &&
    computeRunMP(unit.cruiseMP) < 4
  ) {
    errors.push('Glider ProtoMeks have a minimum flanking MP of 4.');
  }
  return errors;
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
 * Validate Main Gun and arm placement against the pinned verifier
 * (TestProtoMek.java:296-380, 606-678; MegaMek 48fcb2f64):
 * - the Main Gun holds one slot-taking mount, two on a quad ultraheavy
 * - an arm holds one mount of at most 0.5 t (1.0 t ultraheavy); a quad has none
 * - a weapon the catalog excludes from ProtoMechs is illegal
 * An enabled Main Gun may be empty, as upstream allows.
 */
export function validateProtoMainGun(
  snapshot: Pick<
    ProtoMechBuildSnapshot,
    'tonnage' | 'chassisType' | 'equipmentPlacements'
  >,
): ValidationRuleResult {
  const { tonnage, chassisType, equipmentPlacements } = snapshot;
  const findings: ValidationFinding[] = getProtoPlacementErrors(
    tonnage,
    chassisType === ProtoChassis.QUAD,
    equipmentPlacements,
  ).map((message) => ({
    ruleId: RULE_PROTO_MAIN_GUN,
    severity: 'error' as const,
    message,
  }));

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
