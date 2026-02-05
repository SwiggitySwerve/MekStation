import {
  createDefaultCampaignOptions,
  ICampaignOptions,
} from '../../../types/campaign/Campaign';
import { validateCampaignOptions } from '../optionValidation';

describe('optionValidation', () => {
  describe('validateCampaignOptions', () => {
    it('should return valid for default options', () => {
      const result = validateCampaignOptions(createDefaultCampaignOptions());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error on negative healingRateMultiplier', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        healingRateMultiplier: -1,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'healingRateMultiplier'),
      ).toBe(true);
    });

    it('should error on negative salaryMultiplier', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        salaryMultiplier: -0.5,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'salaryMultiplier')).toBe(
        true,
      );
    });

    it('should error on all negative multiplier fields', () => {
      const negativeFields: (keyof ICampaignOptions)[] = [
        'healingRateMultiplier',
        'salaryMultiplier',
        'maintenanceCostMultiplier',
        'repairCostMultiplier',
        'acquisitionCostMultiplier',
        'autoResolveCasualtyRate',
        'xpCostMultiplier',
        'clanPriceMultiplier',
        'mixedTechPriceMultiplier',
        'usedEquipmentMultiplier',
        'damagedEquipmentMultiplier',
        'regardChangeMultiplier',
        'turnoverPayoutMultiplier',
      ];

      for (const field of negativeFields) {
        const options = { ...createDefaultCampaignOptions(), [field]: -1 };
        const result = validateCampaignOptions(options);
        expect(result.errors.some((e) => e.field === field)).toBe(true);
      }
    });

    it('should error on taxRate > 100', () => {
      const options = { ...createDefaultCampaignOptions(), taxRate: 150 };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'taxRate')).toBe(true);
    });

    it('should error on taxRate < 0', () => {
      const options = { ...createDefaultCampaignOptions(), taxRate: -5 };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'taxRate')).toBe(true);
    });

    it('should error on overheadPercent > 100', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        overheadPercent: 200,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'overheadPercent')).toBe(
        true,
      );
    });

    it('should error on maxLoanPercent > 100', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        maxLoanPercent: 101,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'maxLoanPercent')).toBe(
        true,
      );
    });

    it('should error on pilotDeathChance > 1', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        pilotDeathChance: 1.5,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'pilotDeathChance')).toBe(
        true,
      );
    });

    it('should error on pilotDeathChance < 0', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        pilotDeathChance: -0.1,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      // Both the non-negative check and the 0-1 range check should catch this
      expect(result.errors.some((e) => e.field === 'pilotDeathChance')).toBe(
        true,
      );
    });

    it('should error on retirementAge <= 0', () => {
      const options = { ...createDefaultCampaignOptions(), retirementAge: 0 };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'retirementAge')).toBe(true);
    });

    it('should warn when taxes enabled without role-based salaries', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        useTaxes: true,
        useRoleBasedSalaries: false,
      };
      const result = validateCampaignOptions(options);
      expect(result.warnings.some((w) => w.field === 'useTaxes')).toBe(true);
    });

    it('should not warn when taxes enabled with role-based salaries', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        useTaxes: true,
        useRoleBasedSalaries: true,
      };
      const result = validateCampaignOptions(options);
      expect(result.warnings.some((w) => w.field === 'useTaxes')).toBe(false);
    });

    it('should warn when turnover enabled but frequency is never', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        useTurnover: true,
        turnoverCheckFrequency: 'never' as const,
      };
      const result = validateCampaignOptions(options);
      expect(
        result.warnings.some((w) => w.field === 'turnoverCheckFrequency'),
      ).toBe(true);
    });

    it('should not warn when turnover disabled with frequency never', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        useTurnover: false,
        turnoverCheckFrequency: 'never' as const,
      };
      const result = validateCampaignOptions(options);
      expect(
        result.warnings.some((w) => w.field === 'turnoverCheckFrequency'),
      ).toBe(false);
    });

    it('should accept valid boundary values', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        taxRate: 0,
        overheadPercent: 100,
        maxLoanPercent: 0,
        pilotDeathChance: 0,
        retirementAge: 1,
        healingRateMultiplier: 0,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      const options = {
        ...createDefaultCampaignOptions(),
        healingRateMultiplier: -1,
        taxRate: 200,
        retirementAge: 0,
      };
      const result = validateCampaignOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
