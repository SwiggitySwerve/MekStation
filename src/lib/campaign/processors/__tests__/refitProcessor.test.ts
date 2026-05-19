/**
 * Tests for the refit day processor.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRefitOrder } from '@/types/campaign/Refit';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { Money } from '@/types/campaign/Money';
import { RefitClass } from '@/types/campaign/Refit';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import { DayPhase } from '../../dayPipeline';
import { refitProcessor } from '../refitProcessor';

const TEST_DATE = new Date('3025-02-01T00:00:00.000Z');

const TARGET_CONFIG: MechBuildConfig = {
  tonnage: 50,
  engineRating: 250,
  engineType: EngineType.STANDARD,
  gyroType: GyroType.STANDARD,
  internalStructureType: InternalStructureType.STANDARD,
  armorType: ArmorTypeEnum.STANDARD,
  totalArmorPoints: 200,
  cockpitType: CockpitType.STANDARD,
  heatSinkType: HeatSinkType.SINGLE,
  totalHeatSinks: 10,
  jumpMP: 0,
};

function makeCampaign(refitOrders: readonly IRefitOrder[]): ICampaign {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    currentDate: TEST_DATE,
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: TEST_DATE.toISOString(),
    updatedAt: TEST_DATE.toISOString(),
    unitCombatStates: {},
    refitOrders,
  };
}

function makeOrder(overrides: Partial<IRefitOrder> = {}): IRefitOrder {
  return {
    id: 'refit-1',
    unitId: 'unit-1',
    targetConfiguration: TARGET_CONFIG,
    refitClass: RefitClass.VariantUpgrade,
    estimatedCost: 100_000,
    estimatedHours: 16,
    hoursCompleted: 0,
    status: 'in-progress',
    createdAt: TEST_DATE.toISOString(),
    ...overrides,
  };
}

describe('refitProcessor', () => {
  it('registers in the DayPhase.UNITS block', () => {
    expect(refitProcessor.id).toBe('refit');
    expect(refitProcessor.phase).toBe(DayPhase.UNITS);
  });

  it('advances an in-progress refit by the day tech-hours', () => {
    const campaign = makeCampaign([makeOrder({ estimatedHours: 100 })]);
    const result = refitProcessor.process(campaign, TEST_DATE);

    const order = result.campaign.refitOrders?.[0];
    expect(order?.hoursCompleted).toBeGreaterThan(0);
    expect(order?.status).toBe('in-progress');
    expect(result.events.some((e) => e.type === 'refit-progressed')).toBe(true);
  });

  it('completes the refit when the hour budget is met and swaps the configuration', () => {
    // estimatedHours equal to one day's allowance so it completes in a tick.
    const campaign = makeCampaign([
      makeOrder({ estimatedHours: 8, hoursCompleted: 0 }),
    ]);
    const result = refitProcessor.process(campaign, TEST_DATE);

    const order = result.campaign.refitOrders?.[0];
    expect(order?.status).toBe('completed');
    expect(result.campaign.unitConfigurations?.['unit-1']).toEqual(
      TARGET_CONFIG,
    );
    expect(result.events.some((e) => e.type === 'refit-completed')).toBe(true);
  });

  it('is a no-op when there are no in-progress refits', () => {
    const campaign = makeCampaign([
      makeOrder({ status: 'completed' }),
      makeOrder({ id: 'refit-2', status: 'proposed' }),
    ]);
    const result = refitProcessor.process(campaign, TEST_DATE);
    expect(result.campaign).toBe(campaign);
    expect(result.events).toEqual([]);
  });

  it('is a no-op when the campaign has no refit orders at all', () => {
    const campaign = makeCampaign([]);
    const result = refitProcessor.process(campaign, TEST_DATE);
    expect(result.campaign).toBe(campaign);
  });

  it('leaves non-in-progress orders untouched while advancing the active one', () => {
    const campaign = makeCampaign([
      makeOrder({ id: 'a', status: 'in-progress', estimatedHours: 100 }),
      makeOrder({ id: 'b', status: 'proposed' }),
    ]);
    const result = refitProcessor.process(campaign, TEST_DATE);
    const b = result.campaign.refitOrders?.find((o) => o.id === 'b');
    expect(b?.status).toBe('proposed');
    expect(b?.hoursCompleted).toBe(0);
  });
});
