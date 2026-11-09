/**
 * Company morale survives a real save and reload of the campaign store.
 *
 * App-design rule (Root ruling for K-M4, not MekHQ parity): paid costs score
 * 0, so a solvent company does not climb, and a victory counts once. The day
 * pipeline here is the real one the store runs, with the roster store seeded
 * so the daily-costs processor really charges salaries each day.
 *
 * @spec openspec/changes/fix-company-morale-pay-baseline/specs/campaign-refit-and-prestige/spec.md
 */
import { toast } from '@/components/shared/Toast';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { resetEventStore } from '@/services/events';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums';
import { Money } from '@/types/campaign/Money';
import { MoraleState } from '@/types/campaign/Prestige';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { resetSequence } from '@/utils/events/eventFactory';

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

// A fixed in-game date. `createCampaign` stamps the real clock, and the morale
// window keeps an outcome only if `capturedAt` is on or before the campaign
// date, so an outcome stamped from `new Date()` a millisecond after the
// campaign was created was dropped on some runs. Every test sets this date and
// stamps its outcome from it.
//
// LIMIT: this fixture stamps `capturedAt` with an IN-GAME date. Production
// stamps it with the WALL CLOCK (`combatOutcome.ts:242`, `new Date()`), so the
// test below does not prove that a production victory is counted when the
// campaign date and the wall clock are on different timelines. That question
// is not answered here; it is covered by PR4c.
const START = new Date('3025-02-01T00:00:00.000Z');
const CAPTURED_BEFORE_START = new Date(START.getTime() - 60 * 60 * 1000);

function winningOutcome(matchId: string): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    capturedAt: CAPTURED_BEFORE_START.toISOString(),
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 3,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
  };
}

function seedPilots(): void {
  useCampaignRosterStore.getState().reset();
  useCampaignRosterStore.setState({
    pilots: ['p1', 'p2', 'p3'].map((id) => ({
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
    })),
  });
}

beforeEach(() => {
  jest.mocked(toast).mockClear();
  localStorageMock.clear();
  resetEventStore();
  resetSequence(0);
  _resetDayPipeline();
  _resetBuiltinRegistration();
  seedPilots();
});

afterEach(() => {
  useCampaignRosterStore.getState().reset();
});

function advance(store: ReturnType<typeof createCampaignStore>, days: number) {
  for (let day = 0; day < days; day++) {
    const report = store.getState().advanceDay();
    expect(report).not.toBeNull();
  }
}

describe('company morale across a real campaign save and reload', () => {
  it('does not drift on solvent paid days, before or after a reload', () => {
    const store = createCampaignStore();
    const id = store.getState().createCampaign('Solvent', 'mercenary');
    store.getState().updateCampaign({
      currentDate: START,
      finances: { transactions: [], balance: new Money(50_000_000) },
    });
    const before = store.getState().campaign!.finances.balance.amount;

    advance(store, 10);

    // The costs are really being paid out of the treasury.
    expect(store.getState().campaign!.finances.balance.amount).toBeLessThan(
      before,
    );
    expect(store.getState().campaign!.moraleState ?? MoraleState.Steady).toBe(
      MoraleState.Steady,
    );

    const reloaded = createCampaignStore();
    expect(reloaded.getState().loadCampaign(id)).toBe(true);
    advance(reloaded, 10);

    expect(
      reloaded.getState().campaign!.moraleState ?? MoraleState.Steady,
    ).toBe(MoraleState.Steady);
    expect(reloaded.getState().campaign!.moraleTransitions ?? []).toEqual([]);
  });

  it('counts one victory once, including across a reload', () => {
    const store = createCampaignStore();
    const id = store.getState().createCampaign('One win', 'mercenary');
    store.getState().updateCampaign({
      currentDate: START,
      finances: { transactions: [], balance: new Money(50_000_000) },
    });
    store.getState().enqueueOutcome(winningOutcome('match-reload-win'));

    advance(store, 3);
    expect(store.getState().campaign!.moraleState).toBe(MoraleState.High);
    expect(store.getState().campaign!.moraleCountedMatchIds).toEqual([
      'match-reload-win',
    ]);

    const reloaded = createCampaignStore();
    expect(reloaded.getState().loadCampaign(id)).toBe(true);
    expect(reloaded.getState().campaign!.moraleState).toBe(MoraleState.High);
    expect(reloaded.getState().campaign!.moraleCountedMatchIds).toEqual([
      'match-reload-win',
    ]);

    advance(reloaded, 10);

    expect(reloaded.getState().campaign!.moraleState).toBe(MoraleState.High);
    expect(reloaded.getState().campaign!.moraleTransitions).toHaveLength(1);
  });

  it('lowers morale one step on a day pay is missed, and the reload keeps it', () => {
    const store = createCampaignStore();
    const id = store.getState().createCampaign('Broke', 'mercenary');
    store.getState().updateCampaign({
      currentDate: START,
      finances: { transactions: [], balance: new Money(100) },
    });

    advance(store, 1);
    expect(store.getState().campaign!.moraleState).toBe(MoraleState.Unhappy);

    const reloaded = createCampaignStore();
    expect(reloaded.getState().loadCampaign(id)).toBe(true);
    expect(reloaded.getState().campaign!.moraleState).toBe(MoraleState.Unhappy);
  });
});
