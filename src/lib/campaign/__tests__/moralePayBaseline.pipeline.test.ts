/**
 * Company morale through a real day pipeline.
 *
 * App-design rule (Root ruling for K-M4, not MekHQ parity): paid costs are the
 * baseline and score 0, a missed payment scores -1, and a day with no costs
 * event is neutral. These tests drive the REAL daily-costs, post-battle and
 * morale processors through a real `DayPipelineRegistry` so the signal the
 * morale processor sees is the one the daily-costs processor actually emits,
 * over repeated days, and across a serialize / JSON / deserialize reload.
 *
 * @spec openspec/changes/fix-company-morale-pay-baseline/specs/campaign-refit-and-prestige/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums';
import { Money } from '@/types/campaign/Money';
import { MoraleState } from '@/types/campaign/Prestige';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { DayPipelineRegistry, type IDayEvent } from '../dayPipeline';
import {
  deserializeCampaignBody,
  serializeCampaign,
} from '../persistence/serializeCampaign';
import { dailyCostsProcessor } from '../processors/dailyCostsProcessor';
import { moraleProcessor } from '../processors/moraleProcessor';
import { postBattleProcessor } from '../processors/postBattleProcessor';

const START = new Date('3025-02-01T00:00:00.000Z');

function pilot(id: string): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: id,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3020-01-01T00:00:00.000Z'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
  };
}

function outcome(matchId: string, winner: GameSide): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    capturedAt: START.toISOString(),
    report: {
      version: 1,
      matchId,
      winner,
      reason: 'destruction',
      turnCount: 3,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
  };
}

function startingCampaign(opts: {
  readonly balance: number;
  readonly pending?: readonly ICombatOutcome[];
}): ICampaign {
  const base = createCampaign('Pay baseline', 'mercenary', {
    startingFunds: 0,
  });
  return {
    ...base,
    currentDate: START,
    campaignStartDate: START,
    finances: { transactions: [], balance: new Money(opts.balance) },
    moraleState: MoraleState.Steady,
    pendingBattleOutcomes: opts.pending ?? [],
    processedBattleIds: [],
  } as ICampaign;
}

function newPipeline(): DayPipelineRegistry {
  const pipeline = new DayPipelineRegistry();
  pipeline.register(dailyCostsProcessor);
  pipeline.register(postBattleProcessor);
  pipeline.register(moraleProcessor);
  return pipeline;
}

interface IRun {
  readonly campaign: ICampaign;
  readonly states: readonly (MoraleState | undefined)[];
  readonly costEvents: readonly (IDayEvent | undefined)[];
}

/** Run `days` days; optionally save and reload (serialize, JSON, deserialize) between every day. */
function run(
  start: ICampaign,
  days: number,
  opts: { readonly reloadBetweenDays?: boolean } = {},
): IRun {
  const pipeline = newPipeline();
  let campaign = start;
  const states: (MoraleState | undefined)[] = [];
  const costEvents: (IDayEvent | undefined)[] = [];
  for (let day = 0; day < days; day++) {
    const result = pipeline.processDay(campaign);
    campaign = result.campaign;
    if (opts.reloadBetweenDays) {
      campaign = deserializeCampaignBody(
        JSON.parse(JSON.stringify(serializeCampaign(campaign))),
      );
    }
    states.push(campaign.moraleState);
    costEvents.push(result.events.find((e) => e.type === 'daily_costs'));
  }
  return { campaign, states, costEvents };
}

beforeEach(() => {
  useCampaignRosterStore.getState().reset();
  useCampaignRosterStore.setState({
    pilots: [pilot('p1'), pilot('p2'), pilot('p3')],
  });
});

afterEach(() => {
  useCampaignRosterStore.getState().reset();
});

describe('a solvent company that pays its costs every day', () => {
  it('really is charged and solvent: the pipeline emits an info daily_costs event each day', () => {
    const { costEvents, campaign } = run(
      startingCampaign({ balance: 50_000_000 }),
      5,
    );

    expect(costEvents.every((e) => e?.severity === 'info')).toBe(true);
    expect(campaign.finances.balance.amount).toBeLessThan(50_000_000);
    expect(campaign.finances.balance.isPositive()).toBe(true);
  });

  it('does not drift: morale stays Steady with no transition over 30 paid days', () => {
    const { campaign, states } = run(
      startingCampaign({ balance: 50_000_000 }),
      30,
    );

    expect(states.every((s) => s === MoraleState.Steady)).toBe(true);
    expect(campaign.moraleTransitions).toBeUndefined();
  });

  it('does not drift across a save and reload after every day', () => {
    const { campaign, states } = run(
      startingCampaign({ balance: 50_000_000 }),
      30,
      { reloadBetweenDays: true },
    );

    expect(states.every((s) => s === MoraleState.Steady)).toBe(true);
    expect(campaign.moraleTransitions).toBeUndefined();
  });
});

describe('one victory', () => {
  const win = () => outcome('match-win', GameSide.Player);

  it('raises morale one step on the day it is applied and never again over 31 more days', () => {
    const { campaign, states } = run(
      startingCampaign({ balance: 50_000_000, pending: [win()] }),
      32,
    );

    expect(states[0]).toBe(MoraleState.High);
    expect(states.slice(1).every((s) => s === MoraleState.High)).toBe(true);
    expect(campaign.moraleTransitions).toHaveLength(1);
  });

  it('is counted once even when the campaign is saved and reloaded after every day', () => {
    const { campaign, states } = run(
      startingCampaign({ balance: 50_000_000, pending: [win()] }),
      32,
      { reloadBetweenDays: true },
    );

    expect(states[0]).toBe(MoraleState.High);
    expect(states.slice(1).every((s) => s === MoraleState.High)).toBe(true);
    expect(campaign.moraleTransitions).toHaveLength(1);
    expect(campaign.moraleCountedMatchIds).toEqual(['match-win']);
  });
});

describe('a day on which pay is missed', () => {
  it('lowers morale by exactly one step (-1)', () => {
    // 3 pilots cost more than the balance, so the day ends in debt.
    const { costEvents, states } = run(startingCampaign({ balance: 100 }), 1);

    expect(costEvents[0]?.severity).toBe('warning');
    expect(states[0]).toBe(MoraleState.Unhappy);
  });

  it('is not undone by solvent days alone; a victory brings it back', () => {
    const pipeline = newPipeline();
    let campaign = startingCampaign({ balance: 100 });
    campaign = pipeline.processDay(campaign).campaign;
    expect(campaign.moraleState).toBe(MoraleState.Unhappy);

    // Refill the treasury: later days are solvent and paid, which scores 0.
    campaign = {
      ...campaign,
      finances: { ...campaign.finances, balance: new Money(50_000_000) },
    };
    for (let day = 0; day < 10; day++) {
      campaign = pipeline.processDay(campaign).campaign;
    }
    expect(campaign.moraleState).toBe(MoraleState.Unhappy);

    campaign = {
      ...campaign,
      pendingBattleOutcomes: [outcome('match-recover', GameSide.Player)],
    } as ICampaign;
    campaign = pipeline.processDay(campaign).campaign;
    expect(campaign.moraleState).toBe(MoraleState.Steady);
  });
});

describe('a company with no costs at all', () => {
  it('holds morale: a day without a costs event is neutral', () => {
    useCampaignRosterStore.getState().reset();

    const { costEvents, states } = run(
      startingCampaign({ balance: 1_000_000 }),
      10,
    );

    expect(costEvents.every((e) => e === undefined)).toBe(true);
    expect(states.every((s) => s === MoraleState.Steady)).toBe(true);
  });
});
