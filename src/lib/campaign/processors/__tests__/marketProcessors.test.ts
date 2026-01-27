import { ICampaign, createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { IPerson } from '@/types/campaign/Person';
import { IMission } from '@/types/campaign/Mission';
import { IForce } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';
import { PersonnelMarketStyle } from '@/types/campaign/markets/marketTypes';
import { DayPhase } from '../../dayPipeline';
import {
  unitMarketProcessor,
  personnelMarketProcessor,
  contractMarketProcessor,
} from '../marketProcessors';

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    personnel: new Map<string, IPerson>(),
    forces: new Map<string, IForce>(),
    rootForceId: 'force-root',
    missions: new Map<string, IMission>(),
    finances: { transactions: [], balance: new Money(1000000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('unitMarketProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(unitMarketProcessor.id).toBe('unit-market');
    expect(unitMarketProcessor.phase).toBe(DayPhase.MARKETS);
    expect(unitMarketProcessor.displayName).toBe('Unit Market Refresh');
  });

  it('should skip when unitMarketMethod is none', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), unitMarketMethod: 'none' },
    });
    const result = unitMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip when unitMarketMethod is undefined', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), unitMarketMethod: undefined },
    });
    const result = unitMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip on non-first-of-month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), unitMarketMethod: 'atb_monthly' },
    });
    const result = unitMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should refresh on first of month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), unitMarketMethod: 'atb_monthly' },
    });
    const result = unitMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('market_refresh');
    expect(result.events[0].severity).toBe('info');
    expect(result.events[0].description).toContain('Unit market refreshed');
  });
});

describe('personnelMarketProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(personnelMarketProcessor.id).toBe('personnel-market');
    expect(personnelMarketProcessor.phase).toBe(DayPhase.MARKETS);
    expect(personnelMarketProcessor.displayName).toBe('Personnel Market Refresh');
  });

  it('should skip when personnelMarketStyle is disabled', () => {
    const campaign = createTestCampaign({
      options: { ...createDefaultCampaignOptions(), personnelMarketStyle: PersonnelMarketStyle.DISABLED },
    });
    const result = personnelMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip when personnelMarketStyle is undefined', () => {
    const campaign = createTestCampaign({
      options: { ...createDefaultCampaignOptions(), personnelMarketStyle: undefined },
    });
    const result = personnelMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should generate daily when mekhq style', () => {
    const campaign = createTestCampaign({
      options: { ...createDefaultCampaignOptions(), personnelMarketStyle: PersonnelMarketStyle.MEKHQ },
    });
    const result = personnelMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('market_refresh');
    expect(result.events[0].severity).toBe('info');
    expect(result.events[0].description).toContain('Personnel market refreshed');
  });
});

describe('contractMarketProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(contractMarketProcessor.id).toBe('contract-market');
    expect(contractMarketProcessor.phase).toBe(DayPhase.MARKETS);
    expect(contractMarketProcessor.displayName).toBe('Contract Market Refresh');
  });

  it('should skip when contractMarketMethod is none', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), contractMarketMethod: 'none' },
    });
    const result = contractMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip when contractMarketMethod is undefined', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), contractMarketMethod: undefined },
    });
    const result = contractMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip on non-first-of-month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), contractMarketMethod: 'atb_monthly' },
    });
    const result = contractMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should refresh on first of month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: { ...createDefaultCampaignOptions(), contractMarketMethod: 'atb_monthly' },
    });
    const result = contractMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('market_refresh');
    expect(result.events[0].severity).toBe('info');
    expect(result.events[0].description).toContain('Contract market refreshed');
  });
});
