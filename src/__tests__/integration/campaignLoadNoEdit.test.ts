/**
 * Pins PR #3371: a server load with no edit never marks dirty, arms the
 * debounce or writes. The route loader, stores and dirty bridge are real;
 * only the server fetch boundary is mocked.
 *
 * Evidence: contract-lifecycle/S1B-EDIT-PATH-TIMING.md, "Follow-up Task 1"
 * and "Task 1b": eight replacement cases red on 995a870a3, all twelve
 * legacy cases green on 1b13a167c. Matching caches remain controls.
 */
import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { useStore } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';
import { useCampaignRouteLoader } from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { uninstallCampaignPersistenceWiring } from '@/stores/campaign/campaignPersistenceWiring';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  useCampaignPersistenceStore,
} from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';

type Shape = 'sweep' | 'populated';
type Version = 'unversioned' | 'v1';
type CacheKey = 'matching' | 'unkeyed' | 'stale';

const cases = (['sweep', 'populated'] as const).flatMap((shape) =>
  (['unversioned', 'v1'] as const).flatMap((version) =>
    (['matching', 'unkeyed', 'stale'] as const).map((cache) => ({
      shape,
      version,
      cache,
    })),
  ),
);

function campaignFixture(shape: Shape, version: Version) {
  const pack = JSON.parse(
    readFileSync(
      resolve(
        'e2e/scenario-packs/campaign/maintenance-repairbay.campaign.json',
      ),
      'utf8',
    ),
  ) as SerializedCampaign;
  const prototype = Object.values(pack.body.unitMaxStates ?? {})[0];
  if (!prototype) throw new Error('Missing fixture construction maxima');

  // Pin existing maxima for each roster ID: catalog migration is a separate
  // concern and must not require another network boundary in this load test.
  const unitMaxStates = {
    ...pack.body.unitMaxStates,
    ...Object.fromEntries(
      (pack.body.rosterProjection?.units ?? []).map((unit) => [
        unit.unitId,
        { ...prototype, unitId: unit.unitId },
      ]),
    ),
  };
  let campaign: ICampaign =
    shape === 'sweep'
      ? createCampaign('No-edit reload', 'mercenary', {
          startingFunds: 3_000_000,
        })
      : deserializeCampaignBody({ ...pack.body, unitMaxStates });

  if (version === 'v1') {
    const contract = [
      ...deserializeCampaignBody(pack.body).missions.values(),
    ][0];
    if (!contract || contract.type !== 'contract') {
      throw new Error('Missing fixture contract');
    }
    campaign = {
      ...campaign,
      missions: new Map([
        [contract.id, { ...contract, lifecycleRulesVersion: 1 }],
      ]),
    };
  }

  return {
    campaign,
    roster: shape === 'populated' ? pack.body.rosterProjection : undefined,
  };
}

function savedResponse(record: SerializedCampaign): Response {
  return { ok: true, status: 200, json: async () => record } as Response;
}

function setCacheKey(
  store: ReturnType<typeof useCampaignStore>,
  cache: CacheKey,
  record: SerializedCampaign,
): void {
  const state = store.getState();
  if (cache === 'unkeyed') state.setCachedCampaignKey(null);
  if (cache === 'stale') {
    state.setCachedCampaignKey({
      instanceId: record.instanceId,
      revision: record.version - 1,
    });
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  uninstallCampaignPersistenceWiring();
  useCampaignPersistenceStore.getState().reset();
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
  localStorage.clear();
});

afterEach(() => {
  uninstallCampaignPersistenceWiring();
  useCampaignPersistenceStore.getState().reset();
  resetCampaignStore();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test.each(cases)(
  '$shape / $version / $cache: loading without an edit never dirties, arms or writes',
  async ({ shape, version, cache }) => {
    const { campaign, roster } = campaignFixture(shape, version);
    const record = buildSerializedCampaign(campaign, 'device', 1, roster, {
      instanceId: 'server',
    });
    const endpoint = `/api/campaigns/${encodeURIComponent(campaign.id)}`;
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        if (String(input) !== endpoint) {
          throw new Error(`Unexpected network request: ${String(input)}`);
        }
        return savedResponse(record);
      });

    // Save through production code before simulating a document reload.
    const initial = useCampaignStore();
    initial.setState({ campaign });
    const saved = await useCampaignPersistenceStore.getState().saveCampaign();
    expect(saved.status).toBe('saved');
    expect(fetchSpy.mock.calls.map(([, init]) => init?.method)).toEqual([
      'PUT',
    ]);
    setCacheKey(initial, cache, record);

    useCampaignPersistenceStore.getState().reset();
    resetCampaignStore();
    fetchSpy.mockClear();
    const store = useCampaignStore();
    expect(store.getState().rehydratedCampaignId).toBe(campaign.id);
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);

    const timerSpy = jest.spyOn(globalThis, 'setTimeout');
    const transitions: Array<{ dirty: boolean; editSeq: number }> = [];
    const unsubscribe = useCampaignPersistenceStore.subscribe((state) => {
      transitions.push({ dirty: state.dirty, editSeq: state.editSeq });
    });
    let unmount: (() => void) | undefined;

    try {
      const hook = renderHook(() =>
        useCampaignRouteLoader({
          campaign: useStore(store, (state) => state.campaign),
          rehydratedCampaignId: useStore(
            store,
            (state) => state.rehydratedCampaignId,
          ),
          isClient: true,
          router: {
            query: { id: campaign.id },
            asPath: `/gameplay/campaigns/${encodeURIComponent(campaign.id)}`,
          },
        }),
      );
      unmount = hook.unmount;
      await act(async () => {
        // Flush the resolved fetch and production load without advancing the
        // debounce clock. A failed load is asserted below, not retried here.
        for (let index = 0; index < 30; index++) await Promise.resolve();
      });

      const afterLoad = useCampaignPersistenceStore.getState();

      // Observe the full window even if load completion concealed a dirty
      // transition: an earlier timer could still send an unnecessary PUT.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      expect(afterLoad.saveState).toBe('saved');
      expect(afterLoad.dirty).toBe(false);
      expect(afterLoad.editSeq).toBe(0);
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions).not.toContainEqual(
        expect.objectContaining({ dirty: true }),
      );
      expect(transitions.every((state) => state.editSeq === 0)).toBe(true);
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      expect(useCampaignPersistenceStore.getState().editSeq).toBe(0);
      expect(
        timerSpy.mock.calls.filter(
          ([, delay]) => delay === AUTO_SAVE_DEBOUNCE_MS,
        ),
      ).toHaveLength(0);
      expect(
        fetchSpy.mock.calls.map(([, init]) => init?.method ?? 'GET'),
      ).toEqual(['GET']);
    } finally {
      unmount?.();
      unsubscribe();
    }
  },
);
