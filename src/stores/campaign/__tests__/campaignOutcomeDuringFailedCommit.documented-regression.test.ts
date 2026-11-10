/**
 * Documented STOP: rollback of a failed co-op commit must retain an outcome
 * enqueued after its snapshot. Kept red for Root's decision; do not repair the
 * rollback as part of the authoritative-load change.
 *
 * The production snapshot/commit/rollback boundaries are real. Only HTTP is held
 * and failed; day calculations are outside this regression's scope.
 */
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '../campaignPersistenceWiring';
import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  captureDayAdvanceSnapshot,
  recordStoredCampaign,
  rollbackDayAdvance,
} from '../dayAdvanceSnapshot';
import {
  __resetCampaignPersistenceCoordinationForTests,
  useCampaignPersistenceStore,
} from '../useCampaignPersistenceStore';
import { createCampaignStore } from '../useCampaignStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

it('DOCUMENTED REGRESSION: failed co-op commit rollback retains an outcome enqueued after its snapshot', async () => {
  uninstallCampaignPersistenceWiring();
  localStorage.clear();
  useCampaignPersistenceStore.getState().reset();
  __resetCampaignPersistenceCoordinationForTests();
  const store = createCampaignStore();
  registerCampaignStoreAccessor(() => store);
  const campaign = {
    ...buildPopulatedCampaign(),
    coopSession: createHostCoopSession('ROOM-ROLLBACK', 'rollback-race'),
    pendingBattleOutcomes: [],
    processedBattleIds: [],
  };
  store.getState().switchCampaign(campaign);
  installCampaignPersistenceWiring();
  const record = buildSerializedCampaign(campaign, 'server', 3);
  const battle: ICombatOutcome = {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'outcome-after-snapshot',
    contractId: null,
    scenarioId: 'scenario-1',
    capturedAt: '2026-11-10T00:00:00.000Z',
    endReason: CombatEndReason.ObjectiveMet,
    report: {
      version: 1,
      matchId: 'outcome-after-snapshot',
      winner: GameSide.Player,
      reason: 'objective',
      turnCount: 1,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
  };
  let requestStarted: () => void = () => {
    throw new Error('Missing start signal');
  };
  const started = new Promise<void>((resolve) => {
    requestStarted = resolve;
  });
  let failCommit: (reason: Error) => void = () => {
    throw new Error('Commit not started');
  };
  const fetch = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (_url, init) => {
      if (init?.method !== 'PUT')
        return { ok: true, status: 200, json: async () => record } as Response;
      return new Promise<Response>((_resolve, reject) => {
        failCommit = reject;
        requestStarted();
      });
    });
  try {
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
    const snapshot = captureDayAdvanceSnapshot(store.getState, campaign);
    expect(snapshot.pendingBattleOutcomes).toEqual([]);
    store.setState({
      campaign: {
        ...campaign,
        currentDate: new Date('3025-06-16T00:00:00.000Z'),
      },
    });
    recordStoredCampaign(snapshot, store.getState().campaign);
    const committing = store.getState().saveCampaign();
    await started;
    store.getState().enqueueOutcome(battle);
    expect(store.getState().pendingBattleOutcomes).toEqual([battle]);
    failCommit(new Error('Forced asynchronous commit failure'));
    await expect(committing).resolves.toMatchObject({ committed: false });
    expect(
      rollbackDayAdvance(store.setState, store.getState, snapshot),
    ).toBeNull();
    expect(store.getState().processedBattleIds).not.toContain(battle.matchId);
    // RED: the unconditional snapshot-ledger replacement drops this outcome.
    expect(store.getState().pendingBattleOutcomes).toEqual([battle]);
  } finally {
    uninstallCampaignPersistenceWiring();
    useCampaignPersistenceStore.getState().reset();
    __resetCampaignPersistenceCoordinationForTests();
    fetch.mockRestore();
    localStorage.clear();
  }
});
