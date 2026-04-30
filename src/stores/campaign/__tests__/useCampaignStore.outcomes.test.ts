import { getEventStore, resetEventStore } from '@/services/events';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { EventCategory } from '@/types/events';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  CampaignOutcomeEventTypes,
  type IPendingOutcomeAddedPayload,
} from '@/utils/events/campaignOutcomeEvents';
import { resetSequence } from '@/utils/events/eventFactory';

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

function makeOutcome(
  matchId: string,
  overrides: Partial<ICombatOutcome> = {},
): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: 'contract-1',
    scenarioId: 'scenario-1',
    endReason: CombatEndReason.ObjectiveMet,
    capturedAt: '2026-04-25T00:00:00.000Z',
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'objective',
      turnCount: 1,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
    ...overrides,
  };
}

beforeEach(() => {
  localStorageMock.clear();
  resetEventStore();
  resetSequence(0);
});

describe('useCampaignStore outcome queue persistence/events', () => {
  it('persists pending battle outcomes with the campaign record', () => {
    const store = createCampaignStore();
    const campaignId = store
      .getState()
      .createCampaign('Outcome Queue Co.', 'mercenary');

    store.getState().enqueueOutcome(makeOutcome('match-persist'));

    const stored = localStorageMock.getItem(`campaign-${campaignId}`);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!) as {
      state: { pendingBattleOutcomes: ICombatOutcome[] };
    };
    expect(parsed.state.pendingBattleOutcomes).toHaveLength(1);
    expect(parsed.state.pendingBattleOutcomes[0].matchId).toBe('match-persist');

    const hydrated = createCampaignStore();
    expect(hydrated.getState().loadCampaign(campaignId)).toBe(true);
    expect(hydrated.getState().getPendingOutcomes()[0].matchId).toBe(
      'match-persist',
    );
  });

  it('emits one PendingOutcomeAdded campaign event for a newly queued outcome', () => {
    const store = createCampaignStore();
    const campaignId = store
      .getState()
      .createCampaign('Outcome Event Co.', 'mercenary');
    const outcome = makeOutcome('match-event');

    store.getState().enqueueOutcome(outcome);
    store.getState().enqueueOutcome(outcome);

    const events = getEventStore().query({
      filters: {
        category: EventCategory.Campaign,
        types: [CampaignOutcomeEventTypes.PendingOutcomeAdded],
      },
    }).events;

    expect(events).toHaveLength(1);
    expect(events[0].context.campaignId).toBe(campaignId);
    expect(events[0].context.missionId).toBe('contract-1');
    expect(events[0].context.gameId).toBe('match-event');
    const payload = events[0].payload as IPendingOutcomeAddedPayload;
    expect(payload.matchId).toBe('match-event');
    expect(payload.contractId).toBe('contract-1');
    expect(payload.scenarioId).toBe('scenario-1');
    expect(payload.queueLength).toBe(1);
  });
});
