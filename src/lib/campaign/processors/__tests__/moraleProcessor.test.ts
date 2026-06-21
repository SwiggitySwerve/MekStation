/**
 * Tests for the morale day processor.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { Money } from '@/types/campaign/Money';
import { MoraleState } from '@/types/campaign/Prestige';

import { DayPhase, type IDayEvent } from '../../dayPipeline';
import { moraleProcessor } from '../moraleProcessor';

const TEST_DATE = new Date('3025-02-01T00:00:00.000Z');

/** A minimal win/loss outcome stub — only the fields the gatherer reads. */
function outcomeStub(
  winner: 'player' | 'opponent' | 'draw',
  capturedAt: string = TEST_DATE.toISOString(),
): ICombatOutcome {
  return {
    report: { winner },
    capturedAt,
  } as unknown as ICombatOutcome;
}

function makeCampaign(
  overrides: Partial<ICampaign> & {
    readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
    readonly _dayEventsSoFar?: readonly IDayEvent[];
  } = {},
): ICampaign {
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
    ...overrides,
  } as ICampaign;
}

describe('moraleProcessor', () => {
  it('registers in the DayPhase.EVENTS block', () => {
    expect(moraleProcessor.id).toBe('morale');
    expect(moraleProcessor.phase).toBe(DayPhase.EVENTS);
  });

  it('raises morale by one step on recent victories with met pay', () => {
    const campaign = makeCampaign({
      moraleState: MoraleState.Steady,
      recentlyAppliedOutcomes: [outcomeStub('player'), outcomeStub('player')],
    });
    const result = moraleProcessor.process(campaign, TEST_DATE);
    expect(result.campaign.moraleState).toBe(MoraleState.High);
    expect(result.events.some((e) => e.type === 'morale-changed')).toBe(true);
  });

  it('lowers morale by one step on defeats and missed pay', () => {
    const campaign = makeCampaign({
      moraleState: MoraleState.Steady,
      recentlyAppliedOutcomes: [outcomeStub('opponent')],
      _dayEventsSoFar: [
        {
          type: 'daily_costs',
          description: 'Daily costs',
          severity: 'warning',
        },
      ],
    });
    const result = moraleProcessor.process(campaign, TEST_DATE);
    expect(result.campaign.moraleState).toBe(MoraleState.Unhappy);
  });

  it('lowers morale on desertions', () => {
    const campaign = makeCampaign({
      moraleState: MoraleState.Steady,
      _dayEventsSoFar: [
        {
          type: 'turnover_departure',
          description: 'A pilot deserted',
          severity: 'warning',
          data: { departureType: 'deserted' },
        },
        {
          type: 'turnover_departure',
          description: 'Another pilot deserted',
          severity: 'warning',
          data: { departureType: 'deserted' },
        },
      ],
    });
    const result = moraleProcessor.process(campaign, TEST_DATE);
    expect(result.campaign.moraleState).toBe(MoraleState.Unhappy);
  });

  it('moves at most one step even with many negative signals', () => {
    const campaign = makeCampaign({
      moraleState: MoraleState.Elite,
      recentlyAppliedOutcomes: [
        outcomeStub('opponent'),
        outcomeStub('opponent'),
        outcomeStub('opponent'),
      ],
      _dayEventsSoFar: [
        {
          type: 'daily_costs',
          description: 'Daily costs',
          severity: 'critical',
        },
      ],
    });
    const result = moraleProcessor.process(campaign, TEST_DATE);
    expect(result.campaign.moraleState).toBe(MoraleState.High);
  });

  it('is a no-op with no morale-affecting signals', () => {
    // A balanced day: one victory cancelled by one defeat, pay met
    // cancelled by a desertion — net-zero pressure.
    const campaign = makeCampaign({
      moraleState: MoraleState.Steady,
      recentlyAppliedOutcomes: [outcomeStub('player'), outcomeStub('opponent')],
      _dayEventsSoFar: [
        {
          type: 'turnover_departure',
          description: 'A pilot deserted',
          severity: 'warning',
          data: { departureType: 'deserted' },
        },
      ],
    });
    const result = moraleProcessor.process(campaign, TEST_DATE);
    expect(result.campaign).toBe(campaign);
    expect(result.events).toEqual([]);
  });

  it('records the transition on the campaign history', () => {
    const campaign = makeCampaign({
      moraleState: MoraleState.Steady,
      recentlyAppliedOutcomes: [outcomeStub('player'), outcomeStub('player')],
    });
    const result = moraleProcessor.process(campaign, TEST_DATE);
    expect(result.campaign.moraleTransitions).toHaveLength(1);
    expect(result.campaign.moraleTransitions?.[0].to).toBe(MoraleState.High);
  });

  it('ignores and prunes combat outcomes older than one campaign month', () => {
    const campaign = makeCampaign({
      moraleState: MoraleState.Steady,
      recentlyAppliedOutcomes: [
        outcomeStub('opponent', '3024-12-01T00:00:00.000Z'),
        outcomeStub('opponent', '3024-12-15T00:00:00.000Z'),
      ],
    });

    const result = moraleProcessor.process(campaign, TEST_DATE);
    const updated = result.campaign as ICampaign & {
      readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
    };

    expect(updated.moraleState).toBe(MoraleState.High);
    expect(updated.recentlyAppliedOutcomes).toEqual([]);
  });
});
