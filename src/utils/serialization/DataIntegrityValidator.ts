/**
 * Data Integrity Validation Utilities
 * 
 * Implements validation and repair for unit data.
 * 
 * @spec openspec/specs/data-integrity-validation/spec.md
 */

import {
  IIntegrityCheckResult,
  IIntegrityIssue,
  IntegritySeverity,
  IDataRepairResult,
  IDataRepairData,
  IDataIntegrityValidator,
  IRepairOptions,
  IDataRepairOperation,
  IntegrityIssueCodes,
} from '../../types/unit/DataIntegrity';

/**
 * Check referential integrity of equipment references
 */
export function checkEquipmentReferences(unitData: unknown): IIntegrityIssue[] {
  const issues: IIntegrityIssue[] = [];
  
  if (!unitData || typeof unitData !== 'object') {
    return issues;
  }

  const data = unitData as Record<string, unknown>;
  const equipment = data.equipment as Array<Record<string, unknown>> | undefined;
  
  if (!equipment || !Array.isArray(equipment)) {
    return issues;
  }

  for (const item of equipment) {
    if (!item.id || typeof item.id !== 'string') {
      issues.push({
        severity: IntegritySeverity.ERROR,
        code: IntegrityIssueCodes.EQUIPMENT_NOT_FOUND,
        message: 'Equipment item missing ID',
        path: 'equipment',
        canAutoRepair: false,
      });
    }

    if (!item.location || typeof item.location !== 'string') {
      issues.push({
        severity: IntegritySeverity.ERROR,
        code: IntegrityIssueCodes.INVALID_LOCATION,
        message: `Equipment "${item.id}" has invalid location`,
        path: `equipment.${item.id}.location`,
        canAutoRepair: false,
      });
    }
  }

  return issues;
}

/**
 * Check data consistency for weight
 */
export function checkWeightConsistency(unitData: unknown): IIntegrityIssue[] {
  const issues: IIntegrityIssue[] = [];
  
  if (!unitData || typeof unitData !== 'object') {
    return issues;
  }

  const data = unitData as Record<string, unknown>;
  const tonnage = data.tonnage as number | undefined;
  const totalWeight = data.totalWeight as number | undefined;

  if (tonnage && totalWeight && totalWeight > tonnage) {
    issues.push({
      severity: IntegritySeverity.ERROR,
      code: IntegrityIssueCodes.WEIGHT_MISMATCH,
      message: `Total weight (${totalWeight}t) exceeds tonnage (${tonnage}t)`,
      path: 'totalWeight',
      expected: `<= ${tonnage}`,
      actual: `${totalWeight}`,
      canAutoRepair: false,
    });
  }

  return issues;
}

/**
 * Check armor allocation consistency
 */
export function checkArmorConsistency(unitData: unknown): IIntegrityIssue[] {
  const issues: IIntegrityIssue[] = [];
  
  if (!unitData || typeof unitData !== 'object') {
    return issues;
  }

  const data = unitData as Record<string, unknown>;
  const armor = data.armor as Record<string, unknown> | undefined;
  
  if (!armor) {
    issues.push({
      severity: IntegritySeverity.ERROR,
      code: IntegrityIssueCodes.MISSING_REQUIRED_FIELD,
      message: 'Missing armor configuration',
      path: 'armor',
      canAutoRepair: false,
    });
    return issues;
  }

  const allocation = armor.allocation as Record<string, number> | undefined;
  if (!allocation) {
    issues.push({
      severity: IntegritySeverity.ERROR,
      code: IntegrityIssueCodes.MISSING_REQUIRED_FIELD,
      message: 'Missing armor allocation',
      path: 'armor.allocation',
      canAutoRepair: false,
    });
    return issues;
  }

  // Check for negative armor values
  for (const [location, value] of Object.entries(allocation)) {
    if (typeof value === 'number' && value < 0) {
      issues.push({
        severity: IntegritySeverity.ERROR,
        code: IntegrityIssueCodes.ARMOR_EXCEEDS_MAX,
        message: `Negative armor value at ${location}`,
        path: `armor.allocation.${location}`,
        expected: '>= 0',
        actual: `${value}`,
        canAutoRepair: true,
      });
    }
  }

  return issues;
}

/**
 * Check for missing required fields
 */
export function checkRequiredFields(unitData: unknown): IIntegrityIssue[] {
  const issues: IIntegrityIssue[] = [];
  
  if (!unitData || typeof unitData !== 'object') {
    issues.push({
      severity: IntegritySeverity.ERROR,
      code: IntegrityIssueCodes.MISSING_REQUIRED_FIELD,
      message: 'Unit data is not an object',
      canAutoRepair: false,
    });
    return issues;
  }

  const data = unitData as Record<string, unknown>;
  const requiredFields = [
    'chassis', 'model', 'unitType', 'tonnage', 
    'engine', 'armor', 'techBase', 'rulesLevel'
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      issues.push({
        severity: IntegritySeverity.ERROR,
        code: IntegrityIssueCodes.MISSING_REQUIRED_FIELD,
        message: `Missing required field: ${field}`,
        path: field,
        canAutoRepair: false,
      });
    }
  }

  return issues;
}

/**
 * Perform all integrity checks
 */
export function validateDataIntegrity(unitData: unknown): IIntegrityCheckResult {
  const allIssues: IIntegrityIssue[] = [
    ...checkRequiredFields(unitData),
    ...checkEquipmentReferences(unitData),
    ...checkWeightConsistency(unitData),
    ...checkArmorConsistency(unitData),
  ];

  const errorCount = allIssues.filter(i => i.severity === IntegritySeverity.ERROR).length;
  const warningCount = allIssues.filter(i => i.severity === IntegritySeverity.WARNING).length;

  return {
    isValid: errorCount === 0,
    issues: allIssues,
    errorCount,
    warningCount,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Standard repair operations
 */
const REPAIR_OPERATIONS: IDataRepairOperation[] = [
  {
    issueCode: IntegrityIssueCodes.ARMOR_EXCEEDS_MAX,
    description: 'Set negative armor values to 0',
    repair(data: unknown): unknown {
      if (!data || typeof data !== 'object') return data;
      
      const cloned = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
      const armor = cloned.armor as Record<string, unknown> | undefined;
      
      if (armor?.allocation && typeof armor.allocation === 'object') {
        const allocation = armor.allocation as Record<string, number>;
        for (const key of Object.keys(allocation)) {
          if (allocation[key] < 0) {
            allocation[key] = 0;
          }
        }
      }
      
      return cloned;
    },
  },
];

/**
 * Create a data integrity validator instance
 */
export function createDataIntegrityValidator(): IDataIntegrityValidator {
  return {
    validate: validateDataIntegrity,
    
    repair(data: unknown, options?: IRepairOptions): IDataRepairResult {
      const initialCheck = validateDataIntegrity(data);
      const repairableIssues = initialCheck.issues.filter(i => i.canAutoRepair);
      
      if (repairableIssues.length === 0) {
        const repairData: IDataRepairData = {
          repairedData: data,
          appliedRepairs: [],
          failedRepairs: [],
          remainingIssues: initialCheck.issues,
        };
        return { success: true, data: repairData };
      }

      if (options?.dryRun) {
        const repairData: IDataRepairData = {
          appliedRepairs: repairableIssues.map(i => i.code),
          failedRepairs: [],
          remainingIssues: initialCheck.issues.filter(i => !i.canAutoRepair),
        };
        return { success: true, data: repairData };
      }

      let repairedData = data;
      const appliedRepairs: string[] = [];
      const failedRepairs: string[] = [];

      for (const issue of repairableIssues) {
        if (options?.repairCodes && !options.repairCodes.includes(issue.code)) {
          continue;
        }

        const operation = REPAIR_OPERATIONS.find(op => op.issueCode === issue.code);
        if (operation) {
          try {
            repairedData = operation.repair(repairedData);
            appliedRepairs.push(issue.code);
          } catch {
            failedRepairs.push(issue.code);
          }
        }
      }

      const finalCheck = validateDataIntegrity(repairedData);
      const repairData: IDataRepairData = {
        repairedData,
        appliedRepairs,
        failedRepairs,
        remainingIssues: finalCheck.issues,
      };

      if (finalCheck.errorCount === 0) {
        return { success: true, data: repairData };
      }
      return { success: false, error: repairData };
    },

    getAvailableRepairs(): IDataRepairOperation[] {
      return [...REPAIR_OPERATIONS];
    },
  };
}

