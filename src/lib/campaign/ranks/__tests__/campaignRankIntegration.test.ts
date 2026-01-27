import { getCampaignRankSystem } from '@/lib/campaign/ranks/campaignRankIntegration';
import { RANK_SYSTEM_MERCENARY, RANK_SYSTEM_CLAN, RANK_SYSTEM_SLDF } from '@/lib/campaign/ranks/rankSystems';
import { createCampaign } from '@/types/campaign/Campaign';

describe('getCampaignRankSystem', () => {
  it('should return Mercenary system by default', () => {
    const campaign = createCampaign('Test Campaign', 'mercenary');
    const system = getCampaignRankSystem(campaign);
    expect(system.code).toBe('MERC');
    expect(system).toBe(RANK_SYSTEM_MERCENARY);
  });

  it('should return the rank system matching the campaign option', () => {
    const campaign = createCampaign('Clan Campaign', 'clan', {
      rankSystemCode: 'CLAN',
    });
    const system = getCampaignRankSystem(campaign);
    expect(system.code).toBe('CLAN');
    expect(system).toBe(RANK_SYSTEM_CLAN);
  });

  it('should return SLDF system when configured', () => {
    const campaign = createCampaign('SLDF Campaign', 'sldf', {
      rankSystemCode: 'SLDF',
    });
    const system = getCampaignRankSystem(campaign);
    expect(system.code).toBe('SLDF');
    expect(system).toBe(RANK_SYSTEM_SLDF);
  });

  it('should fall back to Mercenary for unknown rank system code', () => {
    const campaign = createCampaign('Unknown', 'mercenary', {
      rankSystemCode: 'NONEXISTENT',
    });
    const system = getCampaignRankSystem(campaign);
    expect(system.code).toBe('MERC');
    expect(system).toBe(RANK_SYSTEM_MERCENARY);
  });

  it('should fall back to Mercenary when rankSystemCode is undefined', () => {
    const campaign = createCampaign('No Code', 'mercenary');
    // Force undefined by spreading without rankSystemCode
    const modifiedCampaign = {
      ...campaign,
      options: { ...campaign.options, rankSystemCode: undefined },
    };
    const system = getCampaignRankSystem(modifiedCampaign);
    expect(system.code).toBe('MERC');
  });
});
