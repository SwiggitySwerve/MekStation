import { createDefaultCampaignOptions } from '../Campaign';
import { OptionGroupId, OPTION_META } from '../CampaignOptionGroup';

describe('CampaignOptionGroup', () => {
  describe('OptionGroupId', () => {
    it('should have 13 groups', () => {
      expect(Object.values(OptionGroupId)).toHaveLength(13);
    });

    it('should have all expected groups', () => {
      expect(OptionGroupId.General).toBe('general');
      expect(OptionGroupId.Personnel).toBe('personnel');
      expect(OptionGroupId.XpProgression).toBe('xp_progression');
      expect(OptionGroupId.Turnover).toBe('turnover');
      expect(OptionGroupId.Financial).toBe('financial');
      expect(OptionGroupId.RepairMaintenance).toBe('repair_maintenance');
      expect(OptionGroupId.Combat).toBe('combat');
      expect(OptionGroupId.ForceOrganization).toBe('force');
      expect(OptionGroupId.Medical).toBe('medical');
      expect(OptionGroupId.FactionStanding).toBe('faction');
      expect(OptionGroupId.Markets).toBe('markets');
      expect(OptionGroupId.Events).toBe('events');
      expect(OptionGroupId.Advanced).toBe('advanced');
    });
  });

  describe('OPTION_META', () => {
    const defaults = createDefaultCampaignOptions();
    const defaultKeys = Object.keys(defaults);

    it('should have a meta entry for every key in createDefaultCampaignOptions', () => {
      for (const key of defaultKeys) {
        expect(OPTION_META[key]).toBeDefined();
        expect(OPTION_META[key].key).toBe(key);
      }
    });

    it('should have count >= Object.keys(createDefaultCampaignOptions()).length', () => {
      const metaCount = Object.keys(OPTION_META).length;
      expect(metaCount).toBeGreaterThanOrEqual(defaultKeys.length);
    });

    it('should have valid group for every entry', () => {
      const validGroups = Object.values(OptionGroupId);
      for (const [_key, meta] of Object.entries(OPTION_META)) {
        expect(validGroups).toContain(meta.group);
      }
    });

    it('should have valid type for every entry', () => {
      const validTypes = ['boolean', 'number', 'string', 'enum'];
      for (const [_key, meta] of Object.entries(OPTION_META)) {
        expect(validTypes).toContain(meta.type);
      }
    });

    it('should have non-empty label and description for every entry', () => {
      for (const [_key, meta] of Object.entries(OPTION_META)) {
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.description.length).toBeGreaterThan(0);
      }
    });

    it('should have enumValues for enum-type entries', () => {
      for (const [_key, meta] of Object.entries(OPTION_META)) {
        if (meta.type === 'enum') {
          expect(meta.enumValues).toBeDefined();
          expect(meta.enumValues!.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have correct default values matching createDefaultCampaignOptions', () => {
      for (const key of defaultKeys) {
        const meta = OPTION_META[key];
        const defaultVal = defaults[key as keyof typeof defaults];
        expect(meta.defaultValue).toEqual(defaultVal);
      }
    });

    it('should include optional fields not in defaults (useAtBScenarios, difficultyMultiplier, autoAwardConfig)', () => {
      expect(OPTION_META['useAtBScenarios']).toBeDefined();
      expect(OPTION_META['difficultyMultiplier']).toBeDefined();
      expect(OPTION_META['autoAwardConfig']).toBeDefined();
    });
  });
});
