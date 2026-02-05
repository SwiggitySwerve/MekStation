import type { ICampaignOptions } from '../../types/campaign/Campaign';

export interface IValidationError {
  readonly field: keyof ICampaignOptions;
  readonly message: string;
}

export interface IValidationWarning {
  readonly field: keyof ICampaignOptions;
  readonly message: string;
}

export interface IValidationResult {
  readonly valid: boolean;
  readonly errors: readonly IValidationError[];
  readonly warnings: readonly IValidationWarning[];
}

export function validateCampaignOptions(
  options: ICampaignOptions,
): IValidationResult {
  const errors: IValidationError[] = [];
  const warnings: IValidationWarning[] = [];

  const nonNegativeFields: (keyof ICampaignOptions)[] = [
    'healingRateMultiplier',
    'salaryMultiplier',
    'maintenanceCostMultiplier',
    'repairCostMultiplier',
    'acquisitionCostMultiplier',
    'autoResolveCasualtyRate',
    'pilotDeathChance',
    'xpCostMultiplier',
    'clanPriceMultiplier',
    'mixedTechPriceMultiplier',
    'usedEquipmentMultiplier',
    'damagedEquipmentMultiplier',
    'regardChangeMultiplier',
    'turnoverPayoutMultiplier',
  ];
  for (const field of nonNegativeFields) {
    const val = options[field];
    if (typeof val === 'number' && val < 0) {
      errors.push({ field, message: `${field} must be >= 0` });
    }
  }

  if (options.taxRate < 0 || options.taxRate > 100) {
    errors.push({
      field: 'taxRate',
      message: 'taxRate must be between 0 and 100',
    });
  }

  if (options.overheadPercent < 0 || options.overheadPercent > 100) {
    errors.push({
      field: 'overheadPercent',
      message: 'overheadPercent must be between 0 and 100',
    });
  }

  if (options.maxLoanPercent < 0 || options.maxLoanPercent > 100) {
    errors.push({
      field: 'maxLoanPercent',
      message: 'maxLoanPercent must be between 0 and 100',
    });
  }

  if (options.pilotDeathChance < 0 || options.pilotDeathChance > 1) {
    errors.push({
      field: 'pilotDeathChance',
      message: 'pilotDeathChance must be between 0 and 1',
    });
  }

  if (options.retirementAge <= 0) {
    errors.push({
      field: 'retirementAge',
      message: 'retirementAge must be > 0',
    });
  }

  if (options.useTaxes && !options.useRoleBasedSalaries) {
    warnings.push({
      field: 'useTaxes',
      message: 'Taxes without role-based salaries may have limited effect',
    });
  }

  if (options.useTurnover && options.turnoverCheckFrequency === 'never') {
    warnings.push({
      field: 'turnoverCheckFrequency',
      message: 'Turnover is enabled but check frequency is "never"',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
