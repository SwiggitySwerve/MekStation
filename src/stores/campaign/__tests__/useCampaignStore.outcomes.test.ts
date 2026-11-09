import { toast } from '@/components/shared/Toast';
import {
  serializeCampaign,
  deserializeCampaignBody,
} from '@/lib/campaign/persistence';
import { applyPostBattle } from '@/lib/campaign/processors/postBattleProcessor';
import * as battleHelpers from '@/lib/campaign/processors/postBattleProcessor.helpers';
import { getEventStore, resetEventStore } from '@/services/events';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  deserializeCampaign,
  serializeCampaign as serializeCampaignState,
} from '@/stores/campaign/useCampaignStore.persistence';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
  type ICombatOutcome,
  type IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import { EventCategory } from '@/types/events';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  CampaignOutcomeEventTypes,
  type IPendingOutcomeAddedPayload,
} from '@/utils/events/campaignOutcomeEvents';
import { resetSequence } from '@/utils/events/eventFactory';

jest.mock('@/lib/campaign/processors/postBattleProcessor.helpers', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/processors/postBattleProcessor.helpers')
  >('@/lib/campaign/processors/postBattleProcessor.helpers');
  return { ...actual, applyUnitDelta: jest.fn(actual.applyUnitDelta) };
});
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

function makePlayerDelta(unitId: string): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 10 },
    internalsRemaining: { CT: 5 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
  };
}

beforeEach(() => {
  jest.mocked(toast).mockClear();
  localStorageMock.clear();
  resetEventStore();
  resetSequence(0);
});

afterEach(() => jest.restoreAllMocks());

describe('useCampaignStore outcome queue persistence/events', () => {
  it.each(['dequeue', 'review'])(
    'does not resurrect an outcome removed by %s when its campaign is loaded again',
    (action) => {
      const store = createCampaignStore();
      store.getState().createCampaign('Drain Queue', 'mercenary');
      store.getState().enqueueOutcome(makeOutcome('drained'));
      if (action === 'dequeue') store.getState().dequeueOutcome('drained');
      else store.getState().markBattleReviewed('drained');
      // A restarted app: a new store rehydrates the saved campaign.
      const reloaded = createCampaignStore();
      expect(reloaded.getState().pendingBattleOutcomes).toEqual([]);
      expect(reloaded.getState().campaign?.pendingBattleOutcomes).toEqual([]);
      // Review acknowledgement does not mean effects were applied.
      expect(reloaded.getState().processedBattleIds).toEqual([]);
    },
  );
  it('isolates pending outcomes across campaign create, switch, and load', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Alpha Queue', 'mercenary');
    store.getState().enqueueOutcome(makeOutcome('alpha-pending'));
    store.getState().saveCampaign();
    const alpha = store.getState().campaign!;
    store.getState().createCampaign('Bravo Queue', 'davion');
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    store.getState().enqueueOutcome(makeOutcome('bravo-pending'));
    store.getState().saveCampaign();
    const bravo = store.getState().campaign!;

    store.getState().switchCampaign(alpha);
    expect(
      store.getState().pendingBattleOutcomes.map((o) => o.matchId),
    ).toEqual(['alpha-pending']);
    store.getState().switchCampaign(bravo);
    expect(
      store.getState().pendingBattleOutcomes.map((o) => o.matchId),
    ).toEqual(['bravo-pending']);
    // Load alpha as the persistence store does: deserialize the saved
    // campaign, then switch to it.
    store
      .getState()
      .switchCampaign(
        deserializeCampaign(
          serializeCampaignState(alpha),
          new Map(),
          new Map(),
        ),
      );
    expect(
      store.getState().pendingBattleOutcomes.map((o) => o.matchId),
    ).toEqual(['alpha-pending']);
  });

  it('hydrates the server ledger before a republish and preserves it through day advancement', () => {
    const source = createCampaignStore();
    source.getState().createCampaign('Server Campaign', 'mercenary');
    const campaign = source.getState().campaign!;
    const outcome = makeOutcome('match-server', {
      unitDeltas: [makePlayerDelta('unit-server')],
    });
    const applied = applyPostBattle(outcome, campaign).campaign;
    const serverCampaign = deserializeCampaignBody(
      JSON.parse(JSON.stringify(serializeCampaign(applied))),
    );
    localStorageMock.clear();
    const store = createCampaignStore();

    store.getState().switchCampaign(serverCampaign);
    expect(store.getState().processedBattleIds).toEqual(['match-server']);
    store.getState().enqueueOutcome(outcome);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    const report = store.getState().advanceDay();
    expect(report).not.toBeNull();
    expect(store.getState().campaign?.processedBattleIds).toEqual([
      'match-server',
    ]);
    expect(serverCampaign.unitPrestige).toHaveLength(1);
    expect(store.getState().campaign?.unitPrestige).toEqual(
      serverCampaign.unitPrestige,
    );
    expect(store.getState().campaign?.unitCombatStates).toEqual(
      serverCampaign.unitCombatStates,
    );
    store.getState().enqueueOutcome(outcome);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
  });

  it('unions both copies for the same campaign and removes applied outcomes from the queue', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Union', 'mercenary');
    const campaign = store.getState().campaign!;
    store.setState({
      pendingBattleOutcomes: [
        makeOutcome('pending-local'),
        makeOutcome('applied-server'),
      ],
      processedBattleIds: ['applied-local'],
      reviewedBattleIds: { 'review-local': 100 },
      outcomeApplyErrors: { old: 'old failure' },
    });
    store.getState().switchCampaign({
      ...campaign,
      pendingBattleOutcomes: [
        makeOutcome('pending-server'),
        makeOutcome('pending-local'),
      ],
      processedBattleIds: ['applied-server'],
      ...{ reviewedBattleIds: { 'review-server': 200 } },
    });

    expect(
      store
        .getState()
        .pendingBattleOutcomes.map((o) => o.matchId)
        .sort(),
    ).toEqual(['pending-local', 'pending-server']);
    expect([...store.getState().processedBattleIds].sort()).toEqual([
      'applied-local',
      'applied-server',
    ]);
    expect(store.getState().reviewedBattleIds).toEqual({
      'review-local': 100,
      'review-server': 200,
    });
    expect(store.getState().outcomeApplyErrors).toEqual({});
  });

  it.each(['store', 'campaign'])(
    'rejects enqueue and retry when only the %s ledger records application',
    (owner) => {
      const store = createCampaignStore();
      store.getState().createCampaign('Applied', 'mercenary');
      const outcome = makeOutcome('already-applied');
      const campaign = store.getState().campaign!;
      store.setState({
        campaign: {
          ...campaign,
          processedBattleIds: owner === 'campaign' ? [outcome.matchId] : [],
        },
        processedBattleIds: owner === 'store' ? [outcome.matchId] : [],
      });
      store.getState().enqueueOutcome(outcome);
      expect(store.getState().pendingBattleOutcomes).toEqual([]);
      // A stale queue must not defeat either ledger's apply-once guard.
      store.setState({ pendingBattleOutcomes: [outcome] });
      expect(store.getState().retryOutcomeApplication(outcome.matchId)).toBe(
        false,
      );
      expect(store.getState().campaign?.recentlyAppliedOutcomes ?? []).toEqual(
        [],
      );
      expect(
        store
          .getState()
          .processedBattleIds.filter((id) => id === outcome.matchId).length,
      ).toBeLessThanOrEqual(1);
    },
  );

  it.each(['retry', 'day'])(
    'surfaces a per-unit failure through %s without replaying committed effects',
    (path) => {
      const store = createCampaignStore();
      store.getState().createCampaign('Partial Failure', 'mercenary');
      const outcome = makeOutcome('partial', {
        unitDeltas: [makePlayerDelta('unit-broken')],
      });
      jest.spyOn(battleHelpers, 'applyUnitDelta').mockImplementationOnce(() => {
        throw new Error('damaged unit data');
      });
      store.getState().enqueueOutcome(outcome);
      if (path === 'retry') {
        expect(store.getState().retryOutcomeApplication(outcome.matchId)).toBe(
          false,
        );
      } else {
        store.getState().advanceDay();
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(
              'unit unit-broken: damaged unit data',
            ),
            variant: 'error',
          }),
        );
      }
      expect(store.getState().outcomeApplyErrors.partial).toContain(
        'unit unit-broken: damaged unit data',
      );
      expect(store.getState().processedBattleIds).toContain('partial');
      store.getState().enqueueOutcome(makeOutcome('partial'));
      expect(store.getState().retryOutcomeApplication('partial')).toBe(false);
      expect(store.getState().campaign?.unitPrestige?.[0].history).toHaveLength(
        1,
      );
      store.getState().advanceDay();
      if (path === 'day') expect(toast).toHaveBeenCalledTimes(1);
    },
  );

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
    expect(hydrated.getState().getPendingOutcomes()[0].matchId).toBe(
      'match-persist',
    );
  });

  it('rehydrates embedded and store ledgers together from the browser cache', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Cached Ledger', 'mercenary');
    store.getState().enqueueOutcome(makeOutcome('cached-pending'));
    store.setState({
      processedBattleIds: ['cached-applied'],
      reviewedBattleIds: { 'cached-review': 7 },
    });
    store.getState().saveCampaign();
    const restored = createCampaignStore();
    expect(restored.getState().processedBattleIds).toEqual(['cached-applied']);
    expect(restored.getState().campaign?.processedBattleIds).toEqual([
      'cached-applied',
    ]);
    expect(
      restored
        .getState()
        .campaign?.pendingBattleOutcomes?.map((o) => o.matchId),
    ).toEqual(['cached-pending']);
    expect(restored.getState().reviewedBattleIds).toEqual({
      'cached-review': 7,
    });
    restored.getState().enqueueOutcome(makeOutcome('cached-applied'));
    expect(restored.getState().getPendingOutcomeCount()).toBe(1);
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
