import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

import {
  getPresetDefinition,
  getAllPresets,
  getCampaignTypeDefaults,
  applyPreset,
  exportPreset,
  importPreset,
} from '../presetService';

describe('presetService', () => {
  describe('getPresetDefinition', () => {
    it('should return correct definition for each preset', () => {
      expect(getPresetDefinition(CampaignPreset.CASUAL).id).toBe(
        CampaignPreset.CASUAL,
      );
      expect(getPresetDefinition(CampaignPreset.STANDARD).id).toBe(
        CampaignPreset.STANDARD,
      );
      expect(getPresetDefinition(CampaignPreset.FULL).id).toBe(
        CampaignPreset.FULL,
      );
      expect(getPresetDefinition(CampaignPreset.CUSTOM).id).toBe(
        CampaignPreset.CUSTOM,
      );
    });
  });

  describe('getAllPresets', () => {
    it('should return all 4 presets', () => {
      const presets = getAllPresets();
      expect(presets).toHaveLength(4);
    });
  });

  describe('getCampaignTypeDefaults', () => {
    it('should return empty object for MERCENARY', () => {
      const defaults = getCampaignTypeDefaults(CampaignType.MERCENARY);
      expect(Object.keys(defaults)).toHaveLength(0);
    });

    it('should return clan defaults for CLAN', () => {
      const defaults = getCampaignTypeDefaults(CampaignType.CLAN);
      expect(defaults.allowClanEquipment).toBe(true);
      expect(defaults.useFactionRules).toBe(true);
    });

    it('should return house command defaults for HOUSE_COMMAND', () => {
      const defaults = getCampaignTypeDefaults(CampaignType.HOUSE_COMMAND);
      expect(defaults.salaryMultiplier).toBe(0);
      expect(defaults.payForSalaries).toBe(false);
    });

    it('should return pirate defaults for PIRATE', () => {
      const defaults = getCampaignTypeDefaults(CampaignType.PIRATE);
      expect(defaults.startingFunds).toBe(500000);
      expect(defaults.trackFactionStanding).toBe(false);
    });

    it('should return comstar defaults for COMSTAR', () => {
      const defaults = getCampaignTypeDefaults(CampaignType.COMSTAR);
      expect(defaults.techLevel).toBe(2);
      expect(defaults.allowClanEquipment).toBe(false);
    });
  });

  describe('applyPreset', () => {
    it('should layer defaults → type defaults → preset overrides', () => {
      const options = applyPreset(
        CampaignPreset.CASUAL,
        CampaignType.MERCENARY,
      );
      expect(options.useTurnover).toBe(false);
      expect(options.healingRateMultiplier).toBe(2.0);
      expect(options.maintenanceCycleDays).toBe(0);
    });

    it('should apply type defaults before preset overrides', () => {
      const options = applyPreset(CampaignPreset.FULL, CampaignType.CLAN);
      // Clan type sets allowClanEquipment=true, Full preset doesn't override it
      expect(options.allowClanEquipment).toBe(true);
      expect(options.useFactionRules).toBe(true);
      // Full preset overrides
      expect(options.useTaxes).toBe(true);
      expect(options.useAcquisitionSystem).toBe(true);
    });

    it('should return defaults for CUSTOM preset with MERCENARY type', () => {
      const options = applyPreset(
        CampaignPreset.CUSTOM,
        CampaignType.MERCENARY,
      );
      const defaults = createDefaultCampaignOptions();
      expect(options).toEqual(defaults);
    });

    it('should apply pirate type defaults with standard preset', () => {
      const options = applyPreset(CampaignPreset.STANDARD, CampaignType.PIRATE);
      // Pirate type: startingFunds=500000, trackFactionStanding=false
      // Standard preset: trackFactionStanding=true (overrides pirate)
      expect(options.startingFunds).toBe(500000);
      expect(options.trackFactionStanding).toBe(true);
    });
  });

  describe('exportPreset', () => {
    it('should export options as formatted JSON', () => {
      const options = createDefaultCampaignOptions();
      const json = exportPreset(options);
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(parsed.healingRateMultiplier).toBe(1.0);
    });
  });

  describe('importPreset', () => {
    it('should import valid JSON as partial options', () => {
      const json = JSON.stringify({
        healingRateMultiplier: 2.0,
        useTurnover: false,
      });
      const partial = importPreset(json);
      expect(partial.healingRateMultiplier).toBe(2.0);
      expect(partial.useTurnover).toBe(false);
    });

    it('should roundtrip export/import', () => {
      const options = createDefaultCampaignOptions();
      const json = exportPreset(options);
      const imported = importPreset(json);
      expect(imported.healingRateMultiplier).toBe(
        options.healingRateMultiplier,
      );
      expect(imported.salaryMultiplier).toBe(options.salaryMultiplier);
      expect(imported.useTurnover).toBe(options.useTurnover);
    });

    it('should throw on invalid JSON', () => {
      expect(() => importPreset('not json')).toThrow();
    });

    it('should throw on non-object JSON', () => {
      expect(() => importPreset('"string"')).toThrow(
        'Invalid preset format: expected an object',
      );
      expect(() => importPreset('[1,2,3]')).toThrow(
        'Invalid preset format: expected an object',
      );
      expect(() => importPreset('null')).toThrow(
        'Invalid preset format: expected an object',
      );
    });
  });
});
