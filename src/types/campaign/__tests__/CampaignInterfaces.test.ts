/**
 * Campaign Interfaces Tests
 *
 * The legacy campaign entity types were removed (owner ruling 2026-11-07, D1);
 * `CampaignInterfaces` now exposes only the live `CampaignPilotStatus` enum.
 */

import { CampaignPilotStatus } from '../CampaignInterfaces';

describe('Campaign Enums', () => {
  describe('CampaignPilotStatus', () => {
    it('should have all expected values', () => {
      expect(CampaignPilotStatus.Active).toBe('active');
      expect(CampaignPilotStatus.Wounded).toBe('wounded');
      expect(CampaignPilotStatus.Critical).toBe('critical');
      expect(CampaignPilotStatus.MIA).toBe('mia');
      expect(CampaignPilotStatus.KIA).toBe('kia');
    });
  });
});
