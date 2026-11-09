import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

/**
 * An applied battle moves company morale whatever the campaign's in-game date is.
 *
 * Production builds an outcome with `deriveCombatOutcome` and passes no
 * `capturedAt`, so it is stamped with the WALL CLOCK (`combatOutcome.ts`). A
 * campaign's date is an IN-GAME date: a fresh campaign starts at the wall clock
 * and then advances one day per day processed, and a campaign set in an era
 * (3025) is centuries away from it. The morale window used to compare the two,
 * so on those timelines the outcome was dropped on the day it was applied and
 * never counted.
 *
 * Nothing here overrides `capturedAt`. The rows are the ones measured on `main`
 * (`w4-k2/pr4c/capturedAt-timeline.json`).
 *
 * @spec openspec/changes/fix-captured-at-time-domain/specs/campaign-refit-and-prestige/spec.md
 */
import { toast } from '@/components/shared/Toast';
import { campaignDaysBetween } from '@/lib/campaign/campaignCalendar';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { pruneTerminalRepairTickets } from '@/lib/campaign/repair/repairTicketLifecycle';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { resetEventStore } from '@/services/events';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import { Money } from '@/types/campaign/Money';
import { MoraleState } from '@/types/campaign/Prestige';
import {
  GameSide,
  type IGameConfig,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { resetSequence } from '@/utils/events/eventFactory';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { endGame } from '@/utils/gameplay/gameSessionCore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const DAY = 24 * 60 * 60 * 1000;

const config: IGameConfig = {
  mapRadius: 10,
  turnLimit: 10,
  victoryConditions: ['destruction'],
  optionalRules: [],
};
const units: IGameUnit[] = [
  {
    id: 'attacker',
    name: 'Hunchback',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'p1',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'target',
    name: 'Marauder',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'p2',
    gunnery: 4,
    piloting: 5,
  },
];

/** A finished session turned into an outcome exactly as production does: NO `capturedAt` override. */
let battleSeq = 0;
function battle(result: 'victory' | 'defeat'): ICombatOutcome {
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = endGame(
    session,
    result === 'victory' ? GameSide.Player : GameSide.Opponent,
    'destruction',
  );
  battleSeq += 1;
  return deriveCombatOutcome({ ...session, id: `timeline-${battleSeq}` });
}

beforeEach(() => {
  jest.mocked(toast).mockClear();
  localStorageMock.clear();
  resetEventStore();
  resetSequence(0);
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
});

afterEach(() => {
  useCampaignRosterStore.getState().reset();
});

function newCampaign(campaignDate: Date) {
  const store = createCampaignStore();
  store.getState().createCampaign('Timeline', 'mercenary');
  store.getState().updateCampaign({
    currentDate: campaignDate,
    finances: { transactions: [], balance: new Money(50_000_000) },
  });
  return store;
}

function advance(store: ReturnType<typeof createCampaignStore>, days: number) {
  for (let day = 0; day < days; day++) {
    expect(store.getState().advanceDay()).not.toBeNull();
  }
}

interface IRow {
  readonly name: string;
  /** The campaign date the battle is applied on, given the wall clock "now". */
  readonly date: (now: number) => Date;
}
const ROWS: readonly IRow[] = [
  {
    name: 'an era campaign, 3025-02-01',
    date: () => new Date('3025-02-01T00:00:00.000Z'),
  },
  {
    name: 'an era campaign, 3050-01-01',
    date: () => new Date('3050-01-01T00:00:00.000Z'),
  },
  {
    name: 'a fresh wall-clock campaign, day 0, battle 20 minutes after creation',
    date: (now) => new Date(now - 20 * 60 * 1000),
  },
  {
    name: 'a fresh wall-clock campaign, day 0, battle 1 second after creation',
    date: (now) => new Date(now - 1000),
  },
  {
    name: 'a campaign whose in-game date is 3 days ahead of the wall clock',
    date: (now) => new Date(now + 3 * DAY),
  },
  {
    name: 'a campaign whose in-game date is 5 days ahead of the wall clock',
    date: (now) => new Date(now + 5 * DAY),
  },
  {
    name: 'a campaign whose in-game date lags the wall clock by 2 days',
    date: (now) => new Date(now - 2 * DAY),
  },
  {
    name: 'a campaign whose in-game date lags the wall clock by 90 days',
    date: (now) => new Date(now - 90 * DAY),
  },
  {
    name: 'a campaign whose in-game date is 40 days ahead of the wall clock',
    date: (now) => new Date(now + 40 * DAY),
  },
];

describe('a battle moves company morale on every timeline (no capturedAt override)', () => {
  it.each(ROWS)('counts a victory once: $name', ({ date }) => {
    const store = newCampaign(date(Date.now()));
    const outcome = battle('victory');
    store.getState().enqueueOutcome(outcome);

    advance(store, 3);

    const campaign = store.getState().campaign!;
    expect(campaign.moraleState).toBe(MoraleState.High);
    expect(campaign.moraleTransitions).toHaveLength(1);
    expect(campaign.moraleCountedMatchIds).toEqual([outcome.matchId]);
  });

  it.each(ROWS)('counts a defeat once: $name', ({ date }) => {
    const store = newCampaign(date(Date.now()));
    const outcome = battle('defeat');
    store.getState().enqueueOutcome(outcome);

    advance(store, 3);

    const campaign = store.getState().campaign!;
    expect(campaign.moraleState).toBe(MoraleState.Unhappy);
    expect(campaign.moraleTransitions).toHaveLength(1);
    expect(campaign.moraleCountedMatchIds).toEqual([outcome.matchId]);
  });

  it.each(ROWS)(
    'keeps the applied outcome in the list after its first day: $name',
    ({ date }) => {
      const store = newCampaign(date(Date.now()));
      const outcome = battle('victory');
      store.getState().enqueueOutcome(outcome);

      advance(store, 1);

      const applied = store.getState().campaign!.recentlyAppliedOutcomes ?? [];
      expect(applied.map((o) => o.matchId)).toEqual([outcome.matchId]);
    },
  );
});

describe('appliedOn is the in-game application day', () => {
  it.each(ROWS)(
    'is stamped from the campaign date, not the wall clock: $name',
    ({ date }) => {
      const campaignDate = date(Date.now());
      const store = newCampaign(campaignDate);
      store.getState().enqueueOutcome(battle('victory'));

      advance(store, 1);

      const [applied] =
        store.getState().campaign!.recentlyAppliedOutcomes ?? [];
      expect(applied.appliedOn).toBe(campaignDate.toISOString());
    },
  );

  it('leaves capturedAt as the wall-clock provenance it was derived with', () => {
    const store = newCampaign(new Date('3025-02-01T00:00:00.000Z'));
    const outcome = battle('victory');
    store.getState().enqueueOutcome(outcome);

    advance(store, 1);

    const [applied] = store.getState().campaign!.recentlyAppliedOutcomes ?? [];
    expect(applied.capturedAt).toBe(outcome.capturedAt);
  });

  it('is stamped by a manual retry of a queued outcome too', () => {
    const campaignDate = new Date('3025-02-01T00:00:00.000Z');
    const store = newCampaign(campaignDate);
    const outcome = battle('victory');
    store.getState().enqueueOutcome(outcome);

    expect(store.getState().retryOutcomeApplication(outcome.matchId)).toBe(
      true,
    );

    const [applied] = store.getState().campaign!.recentlyAppliedOutcomes ?? [];
    expect(applied.appliedOn).toBe(campaignDate.toISOString());
  });
});

describe('the outcome stays for 31 in-game days, then goes', () => {
  const START = new Date('3025-02-01T00:00:00.000Z');

  it('is kept 31 days after it was applied and removed on the next day', () => {
    const store = newCampaign(START);
    const outcome = battle('victory');
    store.getState().enqueueOutcome(outcome);

    // The first pass applies it (day 0); the pass on day N sees it N days old.
    advance(store, 32); // passes for days 0..31
    expect(
      (store.getState().campaign!.recentlyAppliedOutcomes ?? []).map(
        (o) => o.matchId,
      ),
    ).toEqual([outcome.matchId]);
    expect(
      campaignDaysBetween(
        START,
        new Date(store.getState().campaign!.currentDate),
      ),
    ).toBe(32);

    advance(store, 1); // the pass for day 32
    expect(store.getState().campaign!.recentlyAppliedOutcomes ?? []).toEqual(
      [],
    );
  });

  it('counts the battle once however long it is retained', () => {
    const store = newCampaign(START);
    store.getState().enqueueOutcome(battle('victory'));

    advance(store, 40);

    expect(store.getState().campaign!.moraleTransitions).toHaveLength(1);
    expect(store.getState().campaign!.moraleState).toBe(MoraleState.High);
  });

  it('keeps protecting the terminal repair tickets of the match for the full window', () => {
    const store = newCampaign(START);
    const outcome = battle('victory');
    store.getState().enqueueOutcome(outcome);
    const ticket = {
      id: 'ticket-1',
      matchId: outcome.matchId,
      status: 'completed',
    } as unknown as IRepairTicket;

    advance(store, 20);
    const midWindow = store.getState().campaign!;
    expect(
      pruneTerminalRepairTickets({ ...midWindow, repairQueue: [ticket] }),
    ).toHaveLength(1);

    advance(store, 20);
    const afterWindow = store.getState().campaign!;
    expect(
      pruneTerminalRepairTickets({ ...afterWindow, repairQueue: [ticket] }),
    ).toHaveLength(0);
  });
});

describe('across a reload', () => {
  it('counts the battle once and keeps appliedOn through the saved campaign', () => {
    const campaignDate = new Date('3025-02-01T00:00:00.000Z');
    const store = newCampaign(campaignDate);
    const outcome = battle('victory');
    store.getState().enqueueOutcome(outcome);
    advance(store, 3);

    const reloaded = createCampaignStore(); // zustand rehydrate of the saved campaign
    const campaign = reloaded.getState().campaign!;
    expect(campaign.moraleState).toBe(MoraleState.High);
    expect(campaign.recentlyAppliedOutcomes?.[0]?.appliedOn).toBe(
      campaignDate.toISOString(),
    );

    advance(reloaded, 10);
    expect(reloaded.getState().campaign!.moraleTransitions).toHaveLength(1);
  });
});
