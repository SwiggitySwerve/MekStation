/**
 * Conversion Validation
 *
 * Validates converted units against BattleTech construction rules.
 * This is a lightweight validation for the conversion pipeline.
 *
 * @spec unit-json.plan.md
 */

import { ISerializedUnit } from '@/types/unit/UnitSerialization';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation severity
 */
export enum ConversionValidationSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

/**
 * Validation issue
 */
export interface ConversionValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: ConversionValidationSeverity;
  readonly field?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}

/**
 * Validation result
 */
export interface ConversionValidationResult {
  readonly isValid: boolean;
  readonly errors: ConversionValidationIssue[];
  readonly warnings: ConversionValidationIssue[];
  readonly info: ConversionValidationIssue[];
}

// ============================================================================
// CONSTRUCTION CONSTANTS
// ============================================================================

/**
 * Maximum armor by location for various tonnages
 * Based on 2 × internal structure points (head always 9)
 */
const STRUCTURE_POINTS: Record<number, Record<string, number>> = {
  20: { head: 3, centerTorso: 6, sideTorso: 5, arm: 3, leg: 4 },
  25: { head: 3, centerTorso: 8, sideTorso: 6, arm: 4, leg: 6 },
  30: { head: 3, centerTorso: 10, sideTorso: 7, arm: 5, leg: 7 },
  35: { head: 3, centerTorso: 11, sideTorso: 8, arm: 6, leg: 8 },
  40: { head: 3, centerTorso: 12, sideTorso: 10, arm: 6, leg: 10 },
  45: { head: 3, centerTorso: 14, sideTorso: 11, arm: 7, leg: 11 },
  50: { head: 3, centerTorso: 16, sideTorso: 12, arm: 8, leg: 12 },
  55: { head: 3, centerTorso: 18, sideTorso: 13, arm: 9, leg: 13 },
  60: { head: 3, centerTorso: 20, sideTorso: 14, arm: 10, leg: 14 },
  65: { head: 3, centerTorso: 21, sideTorso: 15, arm: 10, leg: 15 },
  70: { head: 3, centerTorso: 22, sideTorso: 15, arm: 11, leg: 15 },
  75: { head: 3, centerTorso: 23, sideTorso: 16, arm: 12, leg: 16 },
  80: { head: 3, centerTorso: 25, sideTorso: 17, arm: 13, leg: 17 },
  85: { head: 3, centerTorso: 27, sideTorso: 18, arm: 14, leg: 18 },
  90: { head: 3, centerTorso: 29, sideTorso: 19, arm: 15, leg: 19 },
  95: { head: 3, centerTorso: 30, sideTorso: 20, arm: 16, leg: 20 },
  100: { head: 3, centerTorso: 31, sideTorso: 21, arm: 17, leg: 21 },
};

/**
 * Valid tonnage values for standard mechs
 */
const VALID_TONNAGES = [
  20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
];

// ============================================================================
// VALIDATION SERVICE
// ============================================================================

/**
 * Validate a converted unit
 */
export function validateConvertedUnit(
  unit: ISerializedUnit,
): ConversionValidationResult {
  const errors: ConversionValidationIssue[] = [];
  const warnings: ConversionValidationIssue[] = [];
  const info: ConversionValidationIssue[] = [];

  // Validate tonnage
  if (!VALID_TONNAGES.includes(unit.tonnage)) {
    warnings.push({
      code: 'INVALID_TONNAGE',
      message: `Tonnage ${unit.tonnage} is not a standard value (20-100 in 5-ton increments)`,
      severity: ConversionValidationSeverity.Warning,
      field: 'tonnage',
      actual: unit.tonnage,
    });
  }

  // Validate engine rating
  if (unit.engine.rating < 10 || unit.engine.rating > 500) {
    errors.push({
      code: 'INVALID_ENGINE_RATING',
      message: `Engine rating ${unit.engine.rating} is out of valid range (10-500)`,
      severity: ConversionValidationSeverity.Error,
      field: 'engine.rating',
      actual: unit.engine.rating,
    });
  }

  if (unit.engine.rating % 5 !== 0) {
    errors.push({
      code: 'INVALID_ENGINE_RATING',
      message: `Engine rating ${unit.engine.rating} must be a multiple of 5`,
      severity: ConversionValidationSeverity.Error,
      field: 'engine.rating',
      actual: unit.engine.rating,
    });
  }

  // Validate movement
  if (unit.movement.walk < 1) {
    errors.push({
      code: 'INVALID_WALK_MP',
      message: 'Walk MP must be at least 1',
      severity: ConversionValidationSeverity.Error,
      field: 'movement.walk',
      actual: unit.movement.walk,
    });
  }

  // Calculate expected walk MP from engine rating and tonnage
  const expectedWalk = Math.floor(unit.engine.rating / unit.tonnage);
  if (unit.movement.walk !== expectedWalk) {
    info.push({
      code: 'WALK_MP_MISMATCH',
      message: `Walk MP ${unit.movement.walk} doesn't match expected ${expectedWalk} from engine rating`,
      severity: ConversionValidationSeverity.Info,
      field: 'movement.walk',
      expected: expectedWalk,
      actual: unit.movement.walk,
    });
  }

  // Validate heat sinks
  if (unit.heatSinks.count < 10) {
    warnings.push({
      code: 'INSUFFICIENT_HEAT_SINKS',
      message: `Mech has ${unit.heatSinks.count} heat sinks, minimum is 10`,
      severity: ConversionValidationSeverity.Warning,
      field: 'heatSinks.count',
      expected: 10,
      actual: unit.heatSinks.count,
    });
  }

  // Validate armor
  validateArmor(unit, errors, warnings);

  // Validate required fields
  if (!unit.id) {
    errors.push({
      code: 'MISSING_ID',
      message: 'Unit ID is required',
      severity: ConversionValidationSeverity.Error,
      field: 'id',
    });
  }

  if (!unit.chassis || unit.chassis.trim() === '') {
    errors.push({
      code: 'MISSING_CHASSIS',
      message: 'Chassis name is required',
      severity: ConversionValidationSeverity.Error,
      field: 'chassis',
    });
  }

  if (!unit.model || unit.model.trim() === '') {
    errors.push({
      code: 'MISSING_MODEL',
      message: 'Model designation is required',
      severity: ConversionValidationSeverity.Error,
      field: 'model',
    });
  }

  // Check for equipment
  if (!unit.equipment || unit.equipment.length === 0) {
    warnings.push({
      code: 'NO_EQUIPMENT',
      message: 'Unit has no mounted equipment',
      severity: ConversionValidationSeverity.Warning,
      field: 'equipment',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/**
 * Validate armor allocation
 */
function validateArmor(
  unit: ISerializedUnit,
  errors: ConversionValidationIssue[],
  warnings: ConversionValidationIssue[],
): void {
  const allocation = unit.armor.allocation;

  // Get structure points for this tonnage
  const nearestTonnage = VALID_TONNAGES.reduce((prev, curr) =>
    Math.abs(curr - unit.tonnage) < Math.abs(prev - unit.tonnage) ? curr : prev,
  );
  const structure = STRUCTURE_POINTS[nearestTonnage];

  if (!structure) {
    warnings.push({
      code: 'UNKNOWN_TONNAGE_FOR_ARMOR',
      message: `Cannot validate armor for tonnage ${unit.tonnage}`,
      severity: ConversionValidationSeverity.Warning,
      field: 'armor',
    });
    return;
  }

  // Validate head armor (max 9)
  const headArmor = typeof allocation.head === 'number' ? allocation.head : 0;
  if (headArmor > 9) {
    errors.push({
      code: 'HEAD_ARMOR_EXCEEDED',
      message: `Head armor ${headArmor} exceeds maximum of 9`,
      severity: ConversionValidationSeverity.Error,
      field: 'armor.allocation.head',
      expected: 9,
      actual: headArmor,
    });
  }

  // Validate other locations (max = 2 × structure points)
  const locationChecks: Array<{
    key: string;
    name: string;
    structureKey: string;
  }> = [
    { key: 'leftArm', name: 'Left Arm', structureKey: 'arm' },
    { key: 'rightArm', name: 'Right Arm', structureKey: 'arm' },
    { key: 'leftLeg', name: 'Left Leg', structureKey: 'leg' },
    { key: 'rightLeg', name: 'Right Leg', structureKey: 'leg' },
  ];

  for (const { key, name, structureKey } of locationChecks) {
    const armor = typeof allocation[key] === 'number' ? allocation[key] : 0;
    const maxArmor = structure[structureKey] * 2;

    if (armor > maxArmor) {
      warnings.push({
        code: 'ARMOR_EXCEEDED',
        message: `${name} armor ${armor} exceeds maximum of ${maxArmor}`,
        severity: ConversionValidationSeverity.Warning,
        field: `armor.allocation.${key}`,
        expected: maxArmor,
        actual: armor,
      });
    }
  }

  // Validate torso locations (front + rear ≤ 2 × structure)
  const torsoChecks: Array<{
    frontKey: string;
    rearKey?: string;
    name: string;
    structureKey: string;
  }> = [
    {
      frontKey: 'centerTorso',
      rearKey: 'centerTorsoRear',
      name: 'Center Torso',
      structureKey: 'centerTorso',
    },
    {
      frontKey: 'leftTorso',
      rearKey: 'leftTorsoRear',
      name: 'Left Torso',
      structureKey: 'sideTorso',
    },
    {
      frontKey: 'rightTorso',
      rearKey: 'rightTorsoRear',
      name: 'Right Torso',
      structureKey: 'sideTorso',
    },
  ];

  for (const { frontKey, rearKey, name, structureKey } of torsoChecks) {
    const frontVal = allocation[frontKey];
    const front =
      typeof frontVal === 'object' && frontVal !== null && 'front' in frontVal
        ? (frontVal as { front: number }).front
        : typeof frontVal === 'number'
          ? frontVal
          : 0;

    const rearVal = rearKey
      ? allocation[rearKey]
      : typeof frontVal === 'object' && frontVal !== null && 'rear' in frontVal
        ? (frontVal as { rear: number }).rear
        : 0;
    const rear = typeof rearVal === 'number' ? rearVal : 0;

    const total = front + rear;
    const maxArmor = structure[structureKey] * 2;

    if (total > maxArmor) {
      warnings.push({
        code: 'ARMOR_EXCEEDED',
        message: `${name} total armor ${total} (${front} front + ${rear} rear) exceeds maximum of ${maxArmor}`,
        severity: ConversionValidationSeverity.Warning,
        field: `armor.allocation.${frontKey}`,
        expected: maxArmor,
        actual: total,
      });
    }
  }
}

/**
 * Validate a batch of units and return summary
 */
export function validateBatch(units: ISerializedUnit[]): {
  total: number;
  valid: number;
  invalid: number;
  withWarnings: number;
  results: Array<{ id: string; result: ConversionValidationResult }>;
} {
  const results: Array<{ id: string; result: ConversionValidationResult }> = [];
  let valid = 0;
  let invalid = 0;
  let withWarnings = 0;

  for (const unit of units) {
    const result = validateConvertedUnit(unit);
    results.push({ id: unit.id, result });

    if (result.isValid) {
      valid++;
      if (result.warnings.length > 0) {
        withWarnings++;
      }
    } else {
      invalid++;
    }
  }

  return {
    total: units.length,
    valid,
    invalid,
    withWarnings,
    results,
  };
}
