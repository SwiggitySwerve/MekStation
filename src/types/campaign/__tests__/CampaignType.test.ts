import {
  CampaignType,
  CAMPAIGN_TYPE_DISPLAY,
  CAMPAIGN_TYPE_DESCRIPTIONS,
  isCampaignType,
} from '../CampaignType';

describe('CampaignType', () => {
  describe('enum values', () => {
    it('should have exactly 5 campaign types', () => {
      const values = Object.values(CampaignType);
      expect(values).toHaveLength(5);
    });

    it('should have all expected types', () => {
      expect(CampaignType.MERCENARY).toBe('mercenary');
      expect(CampaignType.HOUSE_COMMAND).toBe('house_command');
      expect(CampaignType.CLAN).toBe('clan');
      expect(CampaignType.PIRATE).toBe('pirate');
      expect(CampaignType.COMSTAR).toBe('comstar');
    });
  });

  describe('CAMPAIGN_TYPE_DISPLAY', () => {
    it('should have a display name for every campaign type', () => {
      for (const type of Object.values(CampaignType)) {
        expect(CAMPAIGN_TYPE_DISPLAY[type]).toBeDefined();
        expect(typeof CAMPAIGN_TYPE_DISPLAY[type]).toBe('string');
        expect(CAMPAIGN_TYPE_DISPLAY[type].length).toBeGreaterThan(0);
      }
    });

    it('should have correct display names', () => {
      expect(CAMPAIGN_TYPE_DISPLAY[CampaignType.MERCENARY]).toBe('Mercenary Company');
      expect(CAMPAIGN_TYPE_DISPLAY[CampaignType.HOUSE_COMMAND]).toBe('House Command');
      expect(CAMPAIGN_TYPE_DISPLAY[CampaignType.CLAN]).toBe('Clan Touman');
      expect(CAMPAIGN_TYPE_DISPLAY[CampaignType.PIRATE]).toBe('Pirate Band');
      expect(CAMPAIGN_TYPE_DISPLAY[CampaignType.COMSTAR]).toBe('ComStar / Word of Blake');
    });
  });

  describe('CAMPAIGN_TYPE_DESCRIPTIONS', () => {
    it('should have a description for every campaign type', () => {
      for (const type of Object.values(CampaignType)) {
        expect(CAMPAIGN_TYPE_DESCRIPTIONS[type]).toBeDefined();
        expect(typeof CAMPAIGN_TYPE_DESCRIPTIONS[type]).toBe('string');
        expect(CAMPAIGN_TYPE_DESCRIPTIONS[type].length).toBeGreaterThan(0);
      }
    });
  });

  describe('isCampaignType', () => {
    it('should return true for valid campaign types', () => {
      for (const type of Object.values(CampaignType)) {
        expect(isCampaignType(type)).toBe(true);
      }
    });

    it('should return false for invalid strings', () => {
      expect(isCampaignType('invalid')).toBe(false);
      expect(isCampaignType('')).toBe(false);
      expect(isCampaignType('MERCENARY')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isCampaignType(null)).toBe(false);
      expect(isCampaignType(undefined)).toBe(false);
      expect(isCampaignType(42)).toBe(false);
      expect(isCampaignType({})).toBe(false);
    });
  });
});
