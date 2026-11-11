/**
 * Real day/travel actions, post-battle processing, rollback and persist reload.
 * HTTP alone holds and rejects the co-op commit; unrelated processors are left
 * out so the assertions measure outcome preservation and exactly-once effects.
 * @spec openspec/changes/adopt-pending-campaign-write/specs/campaign-persistence/spec.md
 */
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { getDayPipeline, _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { postBattleProcessor } from '@/lib/campaign/processors/postBattleProcessor';
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
  __resetCampaignPersistenceCoordinationForTests,
  useCampaignPersistenceStore,
} from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { createCampaignStore } from '../useCampaignStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));
jest.mock('@/lib/campaign/processors', () => ({
  ...jest.requireActual<typeof import('@/lib/campaign/processors')>(
    '@/lib/campaign/processors',
  ),
  registerBuiltinProcessors: jest.fn(),
}));

const HOST = 'rollback-outcome-host';
const persistence = () => useCampaignPersistenceStore.getState();

function outcome(matchId: string): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: 'scenario-1',
    capturedAt: '2026-11-10T00:00:00.000Z',
    endReason: CombatEndReason.ObjectiveMet,
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
  };
}

const first = outcome('battle-before-snapshot');
const late = outcome('battle-after-snapshot');

describe('outcomes across failed campaign commits', () => {
  let store: ReturnType<typeof createCampaignStore>;
  let remote: SerializedCampaign;
  let holdPut: boolean;
  let failPut: (error: Error) => void;
  let putStarted: Promise<void>;
  let signalPutStarted: () => void;
  let putCount: number;

  function bind(): void {
    registerCampaignStoreAccessor(() => store);
    installCampaignPersistenceWiring();
  }

  function reload(): void {
    uninstallCampaignPersistenceWiring();
    const saved = localStorage.getItem('campaign-store');
    if (saved === null) throw new Error('Missing persisted copy');
    persistence().reset();
    __resetCampaignPersistenceCoordinationForTests();
    localStorage.setItem('campaign-store', saved);
    store = createCampaignStore();
    bind();
  }

  async function world(coop: boolean): Promise<void> {
    const campaign = {
      ...buildPopulatedCampaign(),
      coopSession: coop
        ? createHostCoopSession('ROOM-ROLLBACK', 'rollback-race')
        : undefined,
      pendingBattleOutcomes: [first],
      processedBattleIds: ['previously-applied'],
      recentlyAppliedOutcomes: [],
    };
    remote = {
      ...buildSerializedCampaign(campaign, 'server', 3),
      instanceId: HOST,
      authority: sourceCampaignAuthority(),
    };
    store = createCampaignStore();
    store.getState().switchCampaign(campaign);
    store.getState().setCachedCampaignKey({ instanceId: HOST, revision: 3 });
    bind();
    await persistence().loadCampaign(campaign.id);
  }

  function pendingIds(): string[] {
    return store
      .getState()
      .pendingBattleOutcomes.map((battle) => battle.matchId)
      .sort();
  }

  function expectPending(battles: readonly ICombatOutcome[]): void {
    const ids = battles.map((battle) => battle.matchId).sort();
    expect(pendingIds()).toEqual(ids);
    expect(
      store
        .getState()
        .campaign?.pendingBattleOutcomes?.map((battle) => battle.matchId)
        .sort(),
    ).toEqual(ids);
    expect(store.getState().processedBattleIds).toEqual(['previously-applied']);
    const cache = JSON.parse(
      localStorage.getItem(`campaign-${remote.campaignId}`) ?? '{}',
    ) as {
      state?: {
        pendingBattleOutcomes?: ICombatOutcome[];
        processedBattleIds?: string[];
      };
    };
    expect(
      cache.state?.pendingBattleOutcomes
        ?.map((battle) => battle.matchId)
        .sort(),
    ).toEqual(ids);
    expect(cache.state?.processedBattleIds).toEqual(['previously-applied']);
  }

  function expectAppliedOnce(battles: readonly ICombatOutcome[]): void {
    expect(pendingIds()).toEqual([]);
    const applied = store.getState().campaign?.recentlyAppliedOutcomes ?? [];
    for (const battle of battles) {
      expect(
        store
          .getState()
          .processedBattleIds.filter((id) => id === battle.matchId),
      ).toHaveLength(1);
      expect(
        applied.filter((entry) => entry.matchId === battle.matchId),
      ).toHaveLength(1);
    }
  }

  function destination(): string {
    const id = [
      'tharkad',
      'luthien',
      'new-avalon',
      'sian',
      'atreus',
      'outreach',
      'galatea',
      'hesperus-ii',
    ].find(
      (systemId) =>
        store.getState().previewTravelToSystem(systemId)?.status === 'ready',
    );
    if (!id) throw new Error('No valid travel destination');
    return id;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    uninstallCampaignPersistenceWiring();
    localStorage.clear();
    persistence().reset();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignRosterStore.getState().reset();
    _resetDayPipeline();
    getDayPipeline().register(postBattleProcessor);
    holdPut = true;
    putCount = 0;
    failPut = () => {
      throw new Error('No PUT to fail');
    };
    signalPutStarted = () => {
      throw new Error('Missing start signal');
    };
    putStarted = new Promise<void>((resolve) => {
      signalPutStarted = resolve;
    });
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (init?.method !== 'PUT')
        return { ok: true, status: 200, json: async () => remote } as Response;
      putCount += 1;
      if (holdPut)
        return new Promise<Response>((_resolve, reject) => {
          failPut = reject;
          signalPutStarted();
        });
      const body = JSON.parse(String(init.body)) as {
        envelope: SerializedCampaign;
        baseVersion: number;
      };
      expect(body.baseVersion).toBe(remote.version);
      remote = {
        ...body.envelope,
        version: remote.version + 1,
        instanceId: HOST,
        authority: sourceCampaignAuthority(),
      };
      return { ok: true, status: 200, json: async () => remote } as Response;
    });
  });

  afterEach(() => {
    uninstallCampaignPersistenceWiring();
    persistence().reset();
    __resetCampaignPersistenceCoordinationForTests();
    _resetDayPipeline();
    jest.restoreAllMocks();
    jest.useRealTimers();
    localStorage.clear();
  });

  it.each([false, true])(
    'restores the failed day and keeps a late outcome through reload and one retry (duplicate delivery: %s)',
    async (duplicate) => {
      await world(true);
      const committing = store.getState().advanceDay();
      await putStarted;
      expect(store.getState().processedBattleIds).toContain(first.matchId);
      expect(pendingIds()).toEqual([]);
      store.getState().enqueueOutcome(late);
      if (duplicate) {
        // A repeated completion is ignored while tentatively processed; rollback
        // must restore the original queued copy, not keep that tentative id.
        store.getState().enqueueOutcome(first);
      }
      failPut(new Error('Forced co-op day commit failure'));
      await expect(committing).resolves.toBeNull();
      expectPending([first, late]);
      expect(persistence().dirty).toBe(true);
      expect(store.getState().campaign?.recentlyAppliedOutcomes).toEqual([]);
      reload();
      expect(pendingIds()).toEqual([late.matchId, first.matchId].sort());
      await persistence().loadCampaign(remote.campaignId);
      expectPending([first, late]);
      holdPut = false;
      await expect(store.getState().advanceDay()).resolves.not.toBeNull();
      expectAppliedOnce([first, late]);
      expect(putCount).toBe(2); // One failed attempt and one successful retry.
      reload();
      await persistence().loadCampaign(remote.campaignId);
      expectAppliedOnce([first, late]);
      store.getState().enqueueOutcome(first);
      store.getState().enqueueOutcome(late);
      expectAppliedOnce([first, late]);
    },
  );

  it('keeps a late outcome through failed co-op travel, reload and a successful travel retry', async () => {
    await world(true);
    const target = destination();
    const before = store.getState().campaign;
    const committing = store.getState().travelToSystem(target);
    await putStarted;
    store.getState().enqueueOutcome(late);
    failPut(new Error('Forced co-op travel commit failure'));
    await expect(committing).resolves.toBe(false);
    expectPending([first, late]);
    expect(store.getState().campaign?.currentSystemId).toBe(
      before?.currentSystemId,
    );
    reload();
    await persistence().loadCampaign(remote.campaignId);
    expectPending([first, late]);
    holdPut = false;
    await expect(store.getState().travelToSystem(target)).resolves.toBe(true);
    expect(pendingIds()).toEqual([first.matchId, late.matchId].sort());
    expect(store.getState().campaign?.currentSystemId).toBe(target);
    expect(putCount).toBe(2);
    await store.getState().advanceDay();
    expectAppliedOnce([first, late]);
  });

  it.each(['day', 'travel'] as const)(
    'keeps ordinary synchronous single-player %s rollback and retry unchanged',
    async (operation) => {
      await world(false);
      const before = store.getState();
      const save = before.saveCampaign;
      const target = operation === 'travel' ? destination() : null;
      store.setState({
        saveCampaign: () => {
          throw new Error('Forced synchronous save-tail failure');
        },
      });
      const failed = target
        ? store.getState().travelToSystem(target)
        : store.getState().advanceDay();
      expect(failed).toBe(operation === 'day' ? null : false);
      expect(store.getState().campaign).toBe(before.campaign);
      expect(store.getState().pendingBattleOutcomes).toBe(
        before.pendingBattleOutcomes,
      );
      expect(store.getState().processedBattleIds).toBe(
        before.processedBattleIds,
      );
      expectPending([first]);
      store.setState({ saveCampaign: save });
      reload();
      await persistence().loadCampaign(remote.campaignId);
      expectPending([first]);
      if (target) {
        expect(store.getState().travelToSystem(target)).toBe(true);
        expect(pendingIds()).toEqual([first.matchId]);
      }
      expect(store.getState().advanceDay()).not.toBeNull();
      expectAppliedOnce([first]);
    },
  );
});
