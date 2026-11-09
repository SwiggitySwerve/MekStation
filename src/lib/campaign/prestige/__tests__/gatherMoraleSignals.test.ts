/**
 * Tests for the morale signal gatherer.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import type { IDayEvent } from '../../dayPipeline';

import { gatherMoraleSignals } from '../gatherMoraleSignals';

const TODAY = new Date('3025-02-01T00:00:00.000Z');

function campaignWith(outcomes: readonly ICombatOutcome[] = []): ICampaign {
  return {
    id: 'camp-1',
    currentDate: TODAY,
    recentlyAppliedOutcomes: outcomes,
  } as unknown as ICampaign;
}

function costs(severity: IDayEvent['severity']): IDayEvent {
  return { type: 'daily_costs', description: 'Daily costs', severity };
}

describe('gatherMoraleSignals: pay', () => {
  it('is null on a day with no daily_costs event (no pay information)', () => {
    expect(gatherMoraleSignals(campaignWith(), []).payMet).toBeNull();
  });

  it('is null when only unrelated events happened', () => {
    const other: IDayEvent = {
      type: 'healing',
      description: 'Recovered',
      severity: 'info',
    };

    expect(gatherMoraleSignals(campaignWith(), [other]).payMet).toBeNull();
  });

  it('is true when costs were paid (info severity)', () => {
    expect(gatherMoraleSignals(campaignWith(), [costs('info')]).payMet).toBe(
      true,
    );
  });

  it.each(['warning', 'critical'] as const)(
    'is false when the costs event is %s',
    (severity) => {
      expect(
        gatherMoraleSignals(campaignWith(), [costs(severity)]).payMet,
      ).toBe(false);
    },
  );
});

describe('gatherMoraleSignals: outcomes and desertions are unchanged', () => {
  const outcome = (winner: string): ICombatOutcome =>
    ({
      matchId: `m-${winner}`,
      report: { winner },
      capturedAt: TODAY.toISOString(),
    }) as unknown as ICombatOutcome;

  it('tallies victories and defeats, ignoring draws', () => {
    const signals = gatherMoraleSignals(
      campaignWith([outcome('player'), outcome('opponent'), outcome('draw')]),
      [],
    );

    expect(signals.recentVictories).toBe(1);
    expect(signals.recentDefeats).toBe(1);
  });

  it('counts desertions from turnover_departure events', () => {
    const signals = gatherMoraleSignals(campaignWith(), [
      {
        type: 'turnover_departure',
        description: 'Deserted',
        severity: 'warning',
        data: { departureType: 'deserted' },
      },
      {
        type: 'turnover_departure',
        description: 'Retired',
        severity: 'info',
        data: { departureType: 'retired' },
      },
    ]);

    expect(signals.desertions).toBe(1);
  });
});
