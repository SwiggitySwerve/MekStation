/**
 * T1: the legacy combat-state migration runs on every load that installs a
 * server record: the ordinary load AND the guarded refresh after a committed
 * command (which also cancels any armed autosave, so it could otherwise
 * re-install a record a migration had not yet saved). Owner ruling
 * PARITY-PLAN §186.4: the player entry is flagged and quarantined, and no
 * roster unit (the fixture's ff-roster-unit-1) gets its damage.
 */
import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaignCacheKey } from '@/lib/campaign/persistence/campaignCacheKey';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import legacyFixture from '@/lib/campaign/__tests__/fixtures/legacySessionKeyedCampaign.json';
import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  useCampaignPersistenceStore,
  __resetCampaignPersistenceCoordinationForTests,
} from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));
jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    getById: async () => null,
    getIndex: async () => [],
  }),
}));
const mockQuarantinePut = jest.fn(async () => {});
jest.mock('@/services/persistence/legacyCombatStateQuarantineStore', () => ({
  createIndexedDbLegacyCombatStateQuarantineStore: () => ({
    put: mockQuarantinePut,
    get: async () => [],
  }),
}));

const BASE_VERSION = 11;
const HOST_INSTANCE_ID = 'instance-host-a';
const PLAYER_KEY = 'player-1-atlas-as7-d';

interface MockCampaignStore {
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
  cachedCampaignKey: ICampaignCacheKey | null;
  setCachedCampaignKey: (key: ICampaignCacheKey | null) => void;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

let campaignStore: StoreApi<MockCampaignStore>;

function legacyEnvelope(): SerializedCampaign {
  const { envelope } = legacyFixture as unknown as {
    envelope: SerializedCampaign;
  };
  return {
    ...envelope,
    version: BASE_VERSION + 1,
    instanceId: HOST_INSTANCE_ID,
    authority: sourceCampaignAuthority(),
  };
}

function registerLiveCampaign(campaign: ICampaign): void {
  campaignStore = createStore<MockCampaignStore>((set, get) => ({
    campaign,
    rehydratedCampaignId: null,
    // A different revision: the server record replaces this copy.
    cachedCampaignKey: { instanceId: HOST_INSTANCE_ID, revision: BASE_VERSION },
    setCachedCampaignKey: (key) => set({ cachedCampaignKey: key }),
    updateCampaign: (updates) => {
      const current = get().campaign;
      set({
        campaign: current ? { ...current, ...updates } : (updates as ICampaign),
      });
    },
    switchCampaign: (next) => set({ campaign: next }),
  }));
  registerCampaignStoreAccessor(
    () =>
      campaignStore as unknown as ReturnType<
        Parameters<typeof registerCampaignStoreAccessor>[0]
      >,
  );
}

function liveStateKeys(): string[] {
  return Object.keys(campaignStore.getState().campaign?.unitCombatStates ?? {});
}

function liveFlagKeys(): string[] {
  return (campaignStore.getState().campaign?.legacyCombatStateFlags ?? []).map(
    (flag) => `${flag.sessionUnitId}|${flag.reason}`,
  );
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 50; turn += 1) await Promise.resolve();
}

describe('the legacy combat-state migration on load', () => {
  beforeEach(() => {
    mockQuarantinePut.mockClear();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    const envelope = legacyEnvelope();
    registerLiveCampaign(deserializeCampaignBody(envelope.body));
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        ({
          ok: true,
          status: 200,
          json: async () =>
            String(init?.method ?? 'GET').toUpperCase() === 'GET'
              ? JSON.parse(JSON.stringify(envelope))
              : { ...envelope, version: BASE_VERSION + 2 },
        }) as Response,
    );
    useCampaignPersistenceStore.setState({
      campaignId: envelope.campaignId,
      baseVersion: BASE_VERSION,
      saveState: 'saved',
    });
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    jest.restoreAllMocks();
  });

  it('runs on a guarded refresh after a committed command', async () => {
    const campaignId = legacyEnvelope().campaignId;
    const adopted = await useCampaignPersistenceStore
      .getState()
      .refreshAfterCommittedCommand(
        {
          kind: 'committed',
          state: { campaignId },
          receiptRevision: 4,
          publicHead: 9,
        },
        { isCurrent: () => true },
      );
    await settle();

    expect(adopted).toBe(true);
    expect(mockQuarantinePut).toHaveBeenCalledTimes(1);
    expect(liveStateKeys()).toEqual([]);
    expect(liveFlagKeys()).toEqual([`${PLAYER_KEY}|legacy-not-attributed`]);
  });

  it('runs on an ordinary load', async () => {
    const loaded = await useCampaignPersistenceStore
      .getState()
      .loadCampaign(legacyEnvelope().campaignId);
    await settle();

    expect(loaded).toBe(true);
    expect(mockQuarantinePut).toHaveBeenCalledTimes(1);
    expect(liveStateKeys()).toEqual([]);
    expect(liveFlagKeys()).toEqual([`${PLAYER_KEY}|legacy-not-attributed`]);
  });
});
