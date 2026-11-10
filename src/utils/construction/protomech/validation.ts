/**
 * ProtoMech Construction Validation Rules (VAL-PROTO-*)
 *
 * Five named rules preserve the legacy editor build-snapshot contract.
 * Native source checks use getProtoSourceConstructionErrors. Editor rules:
 *   VAL-PROTO-TONNAGE   — tonnage in legal range
 *   VAL-PROTO-CHASSIS   — an Ultraheavy chassis is 10 t or more
 *   VAL-PROTO-MP        — TestProtoMek.correctMovement (movementRules.ts)
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

import {
  getProtoPlacementErrors,
  getProtoArmorSlotErrors,
  type ProtoEquipmentPlacement,
} from './mainGun';
import {
  getProtoMovementErrors,
  summarizeProtoJumpEquipment,
} from './movementRules';
import { computeProtoWeight, getProtoMinimumWeight } from './weight';
import {
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

/** Native source rules from TestProtoMek.java:246-294,445-464. Movement comes from
 * `movementRules.ts`, the one owner shared with the editor rules below.
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
    computeProtoWeight(unit).total ?? getProtoMinimumWeight(unit);
  if (minimumWeight !== undefined && minimumWeight > unit.weightPerUnit) {
    errors.push(
      `Weight: ${(minimumWeight * 1000).toFixed(1)} kg is greater than ${(unit.weightPerUnit * 1000).toFixed(1)} kg`,
    );
  }
  errors.push(
    ...getProtoMovementErrors({
      walk: unit.cruiseMP,
      jump: unit.jumpMP,
      quad: unit.chassisType === ProtoChassis.QUAD,
      glider: unit.chassisType === ProtoChassis.GLIDER,
      ...summarizeProtoJumpEquipment(unit.equipment),
    }),
  );
  return errors;
}

// =============================================================================
// VAL-PROTO-CHASSIS
// =============================================================================

/** Rule ID constant */
export const RULE_PROTO_CHASSIS = 'VAL-PROTO-CHASSIS';

/**
 * Validate that the chassis label matches the mass: an Ultraheavy chassis needs
 * tonnage ≥ 10 (TestProtoMek.MAX_STD_TONNAGE is 9, so ultraheavy is a mass).
 *
 * Not rules of the pinned verifier, and so not checked: a glider weight limit, a ban
 * on an ultraheavy jumping, or a weight class for the Myomer Booster. The pinned
 * Svartalfa gliders are 14 t, the Sprite Ultraheavy units jump, and Gorgon 6 (8 t)
 * mounts a booster; Java accepts all of them (fixtures/movement-java-verdicts.json).
 */
export function validateProtoChassis(
  snapshot: Pick<
    ProtoMechBuildSnapshot,
    'tonnage' | 'chassisType' | 'jumpMP' | 'myomerBooster'
  >,
): ValidationRuleResult {
  const { tonnage, chassisType } = snapshot;
  const findings: ValidationFinding[] = [];

  if (
    chassisType === ProtoChassis.ULTRAHEAVY &&
    !isChassisLegalForTonnage(chassisType, tonnage)
  ) {
    findings.push({
      ruleId: RULE_PROTO_CHASSIS,
      severity: 'error',
      message: `Ultraheavy chassis requires tonnage ≥ 10 (got ${tonnage} t).`,
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
 * Validate movement with the pinned verifier's rules (`movementRules.ts`, from
 * TestProtoMek.correctMovement): glider flank and quad run minimums, and the jump
 * and UMU cap of maxJumpMP. This checks the BASE walk MP (before booster). There is
 * no weight-class cap on walk or jump in the pinned verifier. Without
 * `equipmentPlacements` no improved jump jet or UMU is assumed.
 */
export function validateProtoMP(
  snapshot: Pick<
    ProtoMechBuildSnapshot,
    'tonnage' | 'walkMP' | 'jumpMP' | 'chassisType'
  > &
    Partial<Pick<ProtoMechBuildSnapshot, 'equipmentPlacements'>>,
): ValidationRuleResult {
  const { walkMP, jumpMP, chassisType, equipmentPlacements = [] } = snapshot;
  const findings: ValidationFinding[] = [];

  if (walkMP < 1) {
    findings.push({
      ruleId: RULE_PROTO_MP,
      severity: 'error',
      message: `Walk MP must be at least 1 (got ${walkMP}).`,
    });
  }

  for (const message of getProtoMovementErrors({
    walk: walkMP,
    jump: jumpMP,
    quad: chassisType === ProtoChassis.QUAD,
    glider: chassisType === ProtoChassis.GLIDER,
    ...summarizeProtoJumpEquipment(equipmentPlacements),
  })) {
    findings.push({ ruleId: RULE_PROTO_MP, severity: 'error', message });
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
