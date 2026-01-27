import {
  CampaignPreset,
  PRESET_CASUAL,
  PRESET_STANDARD,
  PRESET_FULL,
  PRESET_CUSTOM,
  ALL_PRESETS,
} from '../CampaignPreset';

describe('CampaignPreset', () => {
  describe('enum values', () => {
    it('should have exactly 4 presets', () => {
      expect(Object.values(CampaignPreset)).toHaveLength(4);
    });

    it('should have all expected values', () => {
      expect(CampaignPreset.CASUAL).toBe('casual');
      expect(CampaignPreset.STANDARD).toBe('standard');
      expect(CampaignPreset.FULL).toBe('full');
      expect(CampaignPreset.CUSTOM).toBe('custom');
    });
  });

  describe('ALL_PRESETS', () => {
    it('should contain exactly 4 presets', () => {
      expect(ALL_PRESETS).toHaveLength(4);
    });

    it('should contain all preset definitions', () => {
      const ids = ALL_PRESETS.map((p) => p.id);
      expect(ids).toContain(CampaignPreset.CASUAL);
      expect(ids).toContain(CampaignPreset.STANDARD);
      expect(ids).toContain(CampaignPreset.FULL);
      expect(ids).toContain(CampaignPreset.CUSTOM);
    });

    it('should have non-empty name, description, and icon for each preset', () => {
      for (const preset of ALL_PRESETS) {
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.description.length).toBeGreaterThan(0);
        expect(preset.icon.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PRESET_CASUAL', () => {
    it('should disable turnover, taxes, faction standing, and random events', () => {
      expect(PRESET_CASUAL.overrides.useTurnover).toBe(false);
      expect(PRESET_CASUAL.overrides.useTaxes).toBe(false);
      expect(PRESET_CASUAL.overrides.trackFactionStanding).toBe(false);
      expect(PRESET_CASUAL.overrides.useRandomEvents).toBe(false);
    });

    it('should boost healing and disable maintenance', () => {
      expect(PRESET_CASUAL.overrides.healingRateMultiplier).toBe(2.0);
      expect(PRESET_CASUAL.overrides.maintenanceCycleDays).toBe(0);
      expect(PRESET_CASUAL.overrides.payForMaintenance).toBe(false);
    });
  });

  describe('PRESET_STANDARD', () => {
    it('should enable core systems', () => {
      expect(PRESET_STANDARD.overrides.useTurnover).toBe(true);
      expect(PRESET_STANDARD.overrides.useRoleBasedSalaries).toBe(true);
      expect(PRESET_STANDARD.overrides.trackFactionStanding).toBe(true);
      expect(PRESET_STANDARD.overrides.useRandomEvents).toBe(true);
      expect(PRESET_STANDARD.overrides.useLoanSystem).toBe(true);
    });

    it('should disable taxes', () => {
      expect(PRESET_STANDARD.overrides.useTaxes).toBe(false);
    });
  });

  describe('PRESET_FULL', () => {
    it('should enable all major systems', () => {
      expect(PRESET_FULL.overrides.useTurnover).toBe(true);
      expect(PRESET_FULL.overrides.useRoleBasedSalaries).toBe(true);
      expect(PRESET_FULL.overrides.useTaxes).toBe(true);
      expect(PRESET_FULL.overrides.trackFactionStanding).toBe(true);
      expect(PRESET_FULL.overrides.useRandomEvents).toBe(true);
      expect(PRESET_FULL.overrides.useLoanSystem).toBe(true);
      expect(PRESET_FULL.overrides.useAcquisitionSystem).toBe(true);
      expect(PRESET_FULL.overrides.useFoodAndHousing).toBe(true);
    });
  });

  describe('PRESET_CUSTOM', () => {
    it('should have empty overrides', () => {
      expect(Object.keys(PRESET_CUSTOM.overrides)).toHaveLength(0);
    });
  });
});
