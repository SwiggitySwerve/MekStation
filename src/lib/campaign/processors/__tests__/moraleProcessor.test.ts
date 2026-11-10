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

let stubSequence = 0;

/**
 * `capturedAt` is a WALL-CLOCK instant, unrelated to the campaign's in-game
 * date; the stub gives it a fixed value far from `TEST_DATE` so a test that
 * passes only by comparing the two would fail. `appliedOn` is the in-game day
 * the outcome was applied on, which is what the 31-day window reads.
 */
const WALL_CLOCK_CAPTURED_AT = '2026-11-09T12:00:00.000Z';

/** A minimal win/loss outcome stub — only the fields the gatherer reads. */
function outcomeStub(
  winner: 'player' | 'opponent' | 'draw',
  appliedOn: string | null = TEST_DATE.toISOString(),
  matchId: string = `match-${++stubSequence}`,
): ICombatOutcome {
  return {
    matchId,
    report: { winner },
    capturedAt: WALL_CLOCK_CAPTURED_AT,
    ...(appliedOn !== null ? { appliedOn } : {}),
  } as unknown as ICombatOutcome;
}

const COSTS_PAID: IDayEvent = {
  type: 'daily_costs',
  description: 'Daily costs',
  severity: 'info',
};

/** Run `days` consecutive morale evaluations, feeding each day's campaign into the next. */
function runDays(
  start: ICampaign,
  days: number,
  eventsFor: (day: number) => readonly IDayEvent[] = () => [],
): ICampaign {
  let campaign = start;
  for (let day = 0; day < days; day++) {
    const date = new Date(TEST_DATE.getTime() + day * 86_400_000);
    const withEvents = {
      ...campaign,
      currentDate: date,
      _dayEventsSoFar: eventsFor(day),
    } as ICampaign;
    campaign = moraleProcessor.process(withEvents, date).campaign;
  }
  return campaign;
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
    // A balanced day: one victory cancelled by one defeat — net-zero pressure.
    // A day with no costs event carries no pay signal at all.
    const campaign = makeCampaign({
      moraleState: MoraleState.Steady,
      recentlyAppliedOutcomes: [outcomeStub('player'), outcomeStub('opponent')],
    });
    const result = moraleProcessor.process(campaign, TEST_DATE);
    expect(result.campaign.moraleState).toBe(MoraleState.Steady);
    expect(result.campaign.moraleTransitions).toBeUndefined();
    expect(result.events).toEqual([]);
  });

  describe('a day with no costs event is pay-neutral', () => {
    it('holds morale on a day with no signals at all', () => {
      const campaign = makeCampaign({ moraleState: MoraleState.Steady });

      const result = moraleProcessor.process(campaign, TEST_DATE);

      expect(result.campaign).toBe(campaign);
      expect(result.events).toEqual([]);
    });

    it('does not drift to Elite over 30 quiet days with no costs event', () => {
      const final = runDays(
        makeCampaign({ moraleState: MoraleState.Steady }),
        30,
      );

      expect(final.moraleState).toBe(MoraleState.Steady);
      expect(final.moraleTransitions).toBeUndefined();
    });

    it('still lowers morale when pay is reported missed', () => {
      const campaign = makeCampaign({
        moraleState: MoraleState.Steady,
        _dayEventsSoFar: [{ ...COSTS_PAID, severity: 'warning' }],
      });

      const result = moraleProcessor.process(campaign, TEST_DATE);

      expect(result.campaign.moraleState).toBe(MoraleState.Unhappy);
    });
  });

  describe('each applied outcome is counted once', () => {
    it('does not recount one victory on each of the next 31 days', () => {
      const start = makeCampaign({
        moraleState: MoraleState.Steady,
        recentlyAppliedOutcomes: [outcomeStub('player')],
      });

      const final = runDays(start, 31);

      expect(final.moraleState).toBe(MoraleState.High);
      expect(final.moraleTransitions).toHaveLength(1);
    });

    it('records the counted match ids, even on a day whose score nets to zero', () => {
      const win = outcomeStub('player');
      const loss = outcomeStub('opponent');
      const campaign = makeCampaign({
        moraleState: MoraleState.Steady,
        recentlyAppliedOutcomes: [win, loss],
      });

      const result = moraleProcessor.process(campaign, TEST_DATE);

      expect(result.campaign.moraleState).toBe(MoraleState.Steady);
      expect(result.campaign.moraleCountedMatchIds).toEqual([
        win.matchId,
        loss.matchId,
      ]);
    });

    it('returns the campaign untouched once every outcome has been counted', () => {
      const win = outcomeStub('player');
      const counted = moraleProcessor.process(
        makeCampaign({
          moraleState: MoraleState.Steady,
          recentlyAppliedOutcomes: [win],
        }),
        TEST_DATE,
      ).campaign;

      const again = moraleProcessor.process(counted, TEST_DATE);

      expect(again.campaign).toBe(counted);
      expect(again.events).toEqual([]);
    });

    it('counts a later outcome once, on top of one already counted', () => {
      const first = outcomeStub('player');
      const day1 = moraleProcessor.process(
        makeCampaign({
          moraleState: MoraleState.Steady,
          recentlyAppliedOutcomes: [first],
        }),
        TEST_DATE,
      ).campaign;
      expect(day1.moraleState).toBe(MoraleState.High);

      const second = outcomeStub('player');
      const day2 = moraleProcessor.process(
        {
          ...day1,
          recentlyAppliedOutcomes: [first, second],
        } as ICampaign,
        TEST_DATE,
      ).campaign;

      expect(day2.moraleState).toBe(MoraleState.Elite);
      expect(day2.moraleCountedMatchIds).toEqual([
        first.matchId,
        second.matchId,
      ]);
    });

    it('drops the id of an outcome that has left the 31-day window', () => {
      const old = outcomeStub('player', '3024-12-01T00:00:00.000Z');
      const recent = outcomeStub('opponent');
      const campaign = makeCampaign({
        moraleState: MoraleState.Steady,
        moraleCountedMatchIds: [old.matchId, recent.matchId],
        recentlyAppliedOutcomes: [old, recent],
      });

      const result = moraleProcessor.process(campaign, TEST_DATE);

      expect(result.campaign.moraleCountedMatchIds).toEqual([recent.matchId]);
      expect(
        (
          result.campaign as ICampaign & {
            readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
          }
        ).recentlyAppliedOutcomes,
      ).toEqual([recent]);
    });

    it('counts the in-window outcomes of an older save once, because it has no counted ids', () => {
      const win = outcomeStub('player');
      const legacy = makeCampaign({
        moraleState: MoraleState.Steady,
        recentlyAppliedOutcomes: [win],
      });
      expect(legacy.moraleCountedMatchIds).toBeUndefined();

      const final = runDays(legacy, 5);

      expect(final.moraleState).toBe(MoraleState.High);
      expect(final.moraleCountedMatchIds).toEqual([win.matchId]);
    });
  });

  describe('the window reads the in-game application day, never capturedAt', () => {
    it('counts an outcome applied today whatever its wall-clock capturedAt says', () => {
      const win = outcomeStub('player'); // capturedAt is 2026, the campaign is 3025
      const result = moraleProcessor.process(
        makeCampaign({
          moraleState: MoraleState.Steady,
          recentlyAppliedOutcomes: [win],
        }),
        TEST_DATE,
      );
      expect(result.campaign.moraleState).toBe(MoraleState.High);
    });

    it('keeps an outcome 31 days after it was applied and drops it on day 32', () => {
      const win = outcomeStub('player', TEST_DATE.toISOString());
      const base = makeCampaign({
        moraleState: MoraleState.Steady,
        moraleCountedMatchIds: [win.matchId],
        recentlyAppliedOutcomes: [win],
      });
      const day = (n: number) => new Date(TEST_DATE.getTime() + n * 86_400_000);
      const ids = (c: ICampaign) =>
        (
          c as ICampaign & {
            readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
          }
        ).recentlyAppliedOutcomes?.map((o) => o.matchId);
      expect(ids(moraleProcessor.process(base, day(31)).campaign)).toEqual([
        win.matchId,
      ]);
      expect(ids(moraleProcessor.process(base, day(32)).campaign)).toEqual([]);
    });

    it('stamps an entry with no application day instead of dropping it', () => {
      const legacy = outcomeStub('opponent', null); // null: no application day recorded
      const result = moraleProcessor.process(
        makeCampaign({
          moraleState: MoraleState.Steady,
          recentlyAppliedOutcomes: [legacy],
        }),
        TEST_DATE,
      );
      const kept = (
        result.campaign as ICampaign & {
          readonly recentlyAppliedOutcomes?: readonly (ICombatOutcome & {
            readonly appliedOn?: string;
          })[];
        }
      ).recentlyAppliedOutcomes;
      expect(kept).toHaveLength(1);
      expect(kept?.[0].appliedOn).toBe(TEST_DATE.toISOString());
      expect(kept?.[0].matchId).toBe(legacy.matchId);
    });
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

    // The two old defeats would lower morale if they were counted; with no
    // costs event the day carries no pay signal either, so morale holds.
    expect(updated.moraleState).toBe(MoraleState.Steady);
    expect(updated.recentlyAppliedOutcomes).toEqual([]);
  });
});
