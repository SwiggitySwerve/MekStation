import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { IUnitMarketOffer } from '@/types/campaign/markets/marketTypes';

import {
  ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { IForce } from '@/types/campaign/Force';
import {
  MarketExperienceLevel,
  PersonnelMarketStyle,
  type IPersonnelMarketOffer,
} from '@/types/campaign/markets/marketTypes';
import { IMission } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';

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
    forces: new Map<string, IForce>(),
    rootForceId: 'force-root',
    missions: new Map<string, IMission>(),
    finances: { transactions: [], balance: new Money(1000000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides?.unitCombatStates ?? {},
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
      options: {
        ...createDefaultCampaignOptions(),
        unitMarketMethod: undefined,
      },
    });
    const result = unitMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip on non-first-of-month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        unitMarketMethod: 'atb_monthly',
      },
    });
    const result = unitMarketProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should refresh on first of month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        unitMarketMethod: 'atb_monthly',
      },
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
    expect(personnelMarketProcessor.displayName).toBe(
      'Personnel Market Refresh',
    );
  });

  it('should skip when personnelMarketStyle is disabled', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        personnelMarketStyle: PersonnelMarketStyle.DISABLED,
      },
    });
    const result = personnelMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip when personnelMarketStyle is undefined', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        personnelMarketStyle: undefined,
      },
    });
    const result = personnelMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should generate daily when mekhq style', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        personnelMarketStyle: PersonnelMarketStyle.MEKHQ,
      },
    });
    const result = personnelMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('market_refresh');
    expect(result.events[0].severity).toBe('info');
    expect(result.events[0].description).toContain(
      'Personnel market refreshed',
    );
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
      options: {
        ...createDefaultCampaignOptions(),
        contractMarketMethod: 'none',
      },
    });
    const result = contractMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip when contractMarketMethod is undefined', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        contractMarketMethod: undefined,
      },
    });
    const result = contractMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should skip on non-first-of-month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        contractMarketMethod: 'atb_monthly',
      },
    });
    const result = contractMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should refresh on first of month when atb_monthly', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        contractMarketMethod: 'atb_monthly',
      },
    });
    const result = contractMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('market_refresh');
    expect(result.events[0].severity).toBe('info');
    expect(result.events[0].description).toContain('Contract market refreshed');
  });
});

// =============================================================================
// D-7 (2026-06-09 audit, W3.4): generated offers must be STORED on the
// campaign where the command UI reads them (CampaignCommandExtensions),
// not discarded while the day report claims a refresh happened.
// =============================================================================

/** Widened campaign view carrying the command-tier market fields. */
type IMarketCampaign = ICampaignWithCommand & {
  readonly unitMarket?: readonly IUnitMarketOffer[];
};

/** Builds a personnel offer with a controllable expiration date. */
function makePersonnelOffer(
  id: string,
  expirationDate: string,
): IPersonnelMarketOffer {
  return {
    id,
    name: `Recruit ${id}`,
    role: CampaignPersonnelRole.PILOT,
    experienceLevel: MarketExperienceLevel.REGULAR,
    skills: { gunnery: 4, piloting: 5 },
    hireCost: 50000,
    expirationDate,
  };
}

describe('market offers stored on campaign state (D-7)', () => {
  it('unit market refresh stores the generated offers on campaign.unitMarket', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        unitMarketMethod: 'atb_monthly',
      },
    });

    const result = unitMarketProcessor.process(campaign, campaign.currentDate);

    const next = result.campaign as IMarketCampaign;
    const reportedCount = result.events[0].data?.offerCount as number;
    expect(next.unitMarket).toBeDefined();
    expect(next.unitMarket).toHaveLength(reportedCount);
  });

  it('personnel market refresh appends the day offers and prunes expired ones', () => {
    const keep = makePersonnelOffer('pmo-keep', '3025-12-31');
    const expired = makePersonnelOffer('pmo-expired', '3025-06-01');
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        personnelMarketStyle: PersonnelMarketStyle.MEKHQ,
      },
      personnelMarket: [keep, expired],
    } as Partial<ICampaign>);

    const result = personnelMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    const next = result.campaign as IMarketCampaign;
    const reportedCount = result.events[0].data?.offerCount as number;
    const pool = next.personnelMarket ?? [];
    // Non-expired carry-over offer survives the daily refresh…
    expect(pool.some((o) => o.id === 'pmo-keep')).toBe(true);
    // …the expired one is pruned…
    expect(pool.some((o) => o.id === 'pmo-expired')).toBe(false);
    // …and the day's generated offers land in the pool.
    expect(pool).toHaveLength(1 + reportedCount);
  });

  it('contract market refresh replaces offers and clears declined ids', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      options: {
        ...createDefaultCampaignOptions(),
        contractMarketMethod: 'atb_monthly',
      },
      contractMarket: {
        offers: [],
        declinedOfferIds: ['stale-declined-id'],
      },
    } as Partial<ICampaign>);

    const result = contractMarketProcessor.process(
      campaign,
      campaign.currentDate,
    );

    const next = result.campaign as IMarketCampaign;
    const reportedCount = result.events[0].data?.contractCount as number;
    expect(next.contractMarket).toBeDefined();
    expect(next.contractMarket?.offers).toHaveLength(reportedCount);
    // A refresh starts a new market cycle — declined ids reset (the
    // ICampaignContractMarket contract: declined offers stay hidden
    // "until the next contractMarketProcessor refresh").
    expect(next.contractMarket?.declinedOfferIds).toEqual([]);
  });
});
