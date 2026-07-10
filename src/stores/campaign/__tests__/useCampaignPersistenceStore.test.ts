/**
 * Campaign persistence store tests (tasks 4.6, 5.3)
 *
 * Exercises dirty tracking, debounce coalescing, load-rehydrate, conflict
 * surfacing, offline non-fatal errors, and save-metadata updates. `fetch`
 * is stubbed; the live-campaign seam is satisfied with a minimal mock
 * campaign store registered through `campaignStoreAccessor`.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 *   - Requirement: Campaign Persistence Store
 *   - Requirement: Campaign Save Metadata
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { toast } from '@/components/shared/Toast';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  useCampaignPersistenceStore,
} from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({
  toast: jest.fn(),
}));

// =============================================================================
// Minimal mock campaign store for the live-campaign seam
// =============================================================================

interface MockCampaignStore {
  campaign: ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

/** The accessor signature `registerCampaignStoreAccessor` expects. */
type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

function makeMockCampaignStore(
  initial: ICampaign | null,
): StoreApi<MockCampaignStore> {
  return createStore<MockCampaignStore>((set, get) => ({
    campaign: initial,
    updateCampaign: (updates) => {
      const current = get().campaign;
      set({
        campaign: current ? { ...current, ...updates } : (updates as ICampaign),
      });
    },
    switchCampaign: (nextCampaign) => {
      set({ campaign: nextCampaign });
    },
  }));
}

// =============================================================================
// Fetch stubbing
// =============================================================================

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function seedRosterProjection(campaignId: string): void {
  useCampaignRosterStore.setState({
    campaignId,
    units: [
      {
        unitId: 'unit-atlas-as7d',
        unitName: 'Atlas AS7-D',
        pilotId: 'pilot-morgan-kell',
        chassisVariant: 'AS7-D',
        readiness: 'Damaged',
      },
    ],
    pilots: [
      {
        pilotId: 'pilot-morgan-kell',
        pilotName: 'Morgan Kell',
        status: CampaignPilotStatus.Active,
        wounds: 1,
        xp: 2,
        campaignXpEarned: 2,
        campaignKills: 1,
        campaignMissions: 1,
        recoveryTime: 0,
        hireDate: new Date('3025-01-01T00:00:00.000Z'),
        primaryRole: CampaignPersonnelRole.PILOT,
        rankIndex: 0,
        assignedUnitId: 'unit-atlas-as7d',
      },
    ],
    missions: [
      {
        id: 'mission-damage-carry-forward',
        missionNumber: 1,
        name: 'Damage Carry Forward',
        result: 'victory',
        encounterId: 'encounter-damage-carry-forward',
        campaignId,
        deployedUnitIds: ['unit-atlas-as7d'],
        completedAt: '3025-01-02T00:00:00.000Z',
        turnsPlayed: 5,
      },
    ],
    activeMissionId: null,
    missionCount: 1,
  });
}

async function flushPromises(times = 4): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

// =============================================================================
// Setup
// =============================================================================

describe('useCampaignPersistenceStore', () => {
  let campaign: ICampaign;
  let mockStore: StoreApi<MockCampaignStore>;

  beforeEach(() => {
    jest.useFakeTimers();
    campaign = buildPopulatedCampaign();
    mockStore = makeMockCampaignStore(campaign);
    registerCampaignStoreAccessor(
      () => mockStore as unknown as ReturnType<MockAccessor>,
    );
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    jest.mocked(toast).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Dirty tracking + debounce
  // ---------------------------------------------------------------------------

  it('markDirty sets the dirty flag', () => {
    useCampaignPersistenceStore.getState().markDirty();
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
  });

  it('auto-save fires after the debounce interval settles', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-x', 1);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, stored));

    useCampaignPersistenceStore.getState().markDirty();
    expect(fetchMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
  });

  it('coalesces rapid mutations into exactly one save', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-x', 1);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, stored));

    const store = useCampaignPersistenceStore.getState();
    store.markDirty();
    jest.advanceTimersByTime(500);
    store.markDirty();
    jest.advanceTimersByTime(500);
    store.markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Load rehydrate
  // ---------------------------------------------------------------------------

  it('loadCampaign fetches, migrates, deserializes, and writes the live campaign', async () => {
    const envelope = buildSerializedCampaign(campaign, 'device-y', 3);
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, envelope));

    const ok = await useCampaignPersistenceStore
      .getState()
      .loadCampaign(campaign.id);
    expect(ok).toBe(true);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(3);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('loadCampaign rehydrates the server roster projection', async () => {
    const envelope = buildSerializedCampaign(campaign, 'device-y', 3, {
      campaignId: campaign.id,
      units: [
        {
          unitId: 'unit-atlas-as7d',
          unitName: 'Atlas AS7-D',
          pilotId: 'pilot-morgan-kell',
          chassisVariant: 'AS7-D',
          readiness: 'Damaged',
        },
      ],
      pilots: [
        {
          pilotId: 'pilot-morgan-kell',
          pilotName: 'Morgan Kell',
          status: CampaignPilotStatus.Active,
          wounds: 1,
          xp: 2,
          campaignXpEarned: 2,
          campaignKills: 1,
          campaignMissions: 1,
          recoveryTime: 0,
          hireDate: '3025-01-01T00:00:00.000Z',
          primaryRole: CampaignPersonnelRole.PILOT,
          rankIndex: 0,
          assignedUnitId: 'unit-atlas-as7d',
        },
      ],
      missions: [
        {
          id: 'mission-damage-carry-forward',
          missionNumber: 1,
          name: 'Damage Carry Forward',
          result: 'victory',
          encounterId: 'encounter-damage-carry-forward',
          campaignId: campaign.id,
          deployedUnitIds: ['unit-atlas-as7d'],
          completedAt: '3025-01-02T00:00:00.000Z',
          turnsPlayed: 5,
        },
      ],
      activeMissionId: null,
      missionCount: 1,
    });
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, envelope));

    const ok = await useCampaignPersistenceStore
      .getState()
      .loadCampaign(campaign.id);

    expect(ok).toBe(true);
    const roster = useCampaignRosterStore.getState();
    expect(roster.campaignId).toBe(campaign.id);
    expect(roster.units[0]).toMatchObject({
      unitId: 'unit-atlas-as7d',
      unitName: 'Atlas AS7-D',
      readiness: 'Damaged',
    });
    expect(roster.pilots[0].hireDate).toBeInstanceOf(Date);
    expect(roster.pilots[0].hireDate.toISOString()).toBe(
      '3025-01-01T00:00:00.000Z',
    );
    expect(roster.missions[0].deployedUnitIds).toEqual(['unit-atlas-as7d']);
    expect(roster.missionCount).toBe(1);
  });

  it('loadCampaign backfills legacy placeholder roster unit refs', async () => {
    const envelope = buildSerializedCampaign(campaign, 'device-y', 3, {
      campaignId: campaign.id,
      units: [
        {
          unitId: 'unit-light',
          unitName: 'Light Mech',
          chassisVariant: 'Light Mech',
          readiness: 'Ready',
        },
      ],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, envelope));

    const ok = await useCampaignPersistenceStore
      .getState()
      .loadCampaign(campaign.id);

    expect(ok).toBe(true);
    expect(useCampaignRosterStore.getState().units[0]).toMatchObject({
      unitId: 'unit-light',
      unitName: 'Light Mech',
      unitRef: 'locust-lct-1v',
    });
  });

  it('loadCampaign returns false on a 404', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(404, { error: 'not found' }));
    const ok = await useCampaignPersistenceStore
      .getState()
      .loadCampaign('missing');
    expect(ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Conflict surfacing
  // ---------------------------------------------------------------------------

  it('a repeated 409 sets saveState to conflict and exposes the server record', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(409, serverRecord));

    const result = await useCampaignPersistenceStore.getState().saveCampaign();

    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('conflict');
    expect(state.conflictServerRecord).not.toBeNull();
    expect(state.conflictServerRecord?.version).toBe(5);
    expect(result).toMatchObject({ status: 'conflict', retriedConflict: true });
  });

  it('resolveConflictTakeServer adopts the server record', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(409, serverRecord));
    await useCampaignPersistenceStore.getState().saveCampaign();

    const ok = await useCampaignPersistenceStore
      .getState()
      .resolveConflictTakeServer();
    expect(ok).toBe(true);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(5);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('resolveConflictKeepLocal re-PUTs using the server version as base', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, serverRecord))
      .mockResolvedValueOnce(jsonResponse(409, serverRecord));
    await useCampaignPersistenceStore.getState().saveCampaign();

    const accepted = buildSerializedCampaign(campaign, 'device-local', 6);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, accepted));
    await useCampaignPersistenceStore.getState().resolveConflictKeepLocal();

    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(6);
    const keepLocalBody = JSON.parse(
      String((fetchMock.mock.calls[2][1] as RequestInit).body),
    ) as { baseVersion: number };
    expect(keepLocalBody.baseVersion).toBe(5);
  });

  it('refreshes the server version and retries once on a 409 conflict', async () => {
    const conflictRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    const accepted = buildSerializedCampaign(campaign, 'device-local', 6);
    const putBodies: Array<{
      envelope: SerializedCampaign;
      baseVersion: number;
    }> = [];
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockImplementation(async (_input, init) => {
      const body = JSON.parse(
        String((init as RequestInit).body),
      ) as (typeof putBodies)[number];
      putBodies.push(body);
      return putBodies.length === 1
        ? jsonResponse(409, conflictRecord)
        : jsonResponse(200, accepted);
    });

    const result = await useCampaignPersistenceStore.getState().saveCampaign();

    expect(result).toMatchObject({ status: 'saved', retriedConflict: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(putBodies.map((body) => body.baseVersion)).toEqual([0, 5]);
    expect(putBodies[1].envelope.body.name).toBe(campaign.name);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(6);
  });

  it('tracks the accepted server record as last persisted even if live state changes before save resolves', async () => {
    const acceptedCampaign = {
      ...campaign,
      name: 'Server Accepted Snapshot',
    };
    const acceptedRecord = buildSerializedCampaign(
      acceptedCampaign,
      'device-local',
      1,
    );
    let resolveSave!: (response: Response) => void;
    jest.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveSave = resolve;
        }),
    );

    const savePromise = useCampaignPersistenceStore.getState().saveCampaign();
    mockStore.getState().switchCampaign({
      ...campaign,
      name: 'Later Live Optimistic State',
    });
    resolveSave(jsonResponse(200, acceptedRecord));
    await savePromise;

    expect(
      useCampaignPersistenceStore.getState().lastPersistedCampaign?.name,
    ).toBe('Server Accepted Snapshot');
  });

  it('rolls back a co-op campaign and toasts when retrying a 409 remains unresolved', async () => {
    const persistedCampaign = {
      ...campaign,
      coopSession: createHostCoopSession('ROOM12', 'match-coop'),
      currentDate: new Date('3025-01-01T00:00:00.000Z'),
    };
    mockStore.getState().switchCampaign(persistedCampaign);
    const firstAccepted = buildSerializedCampaign(
      persistedCampaign,
      'device-host',
      1,
    );
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, firstAccepted));
    await useCampaignPersistenceStore.getState().saveCampaign();

    const optimisticCampaign = {
      ...persistedCampaign,
      currentDate: new Date('3025-01-02T00:00:00.000Z'),
    };
    mockStore.getState().switchCampaign(optimisticCampaign);
    const serverRecord = buildSerializedCampaign(
      persistedCampaign,
      'device-z',
      2,
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, serverRecord))
      .mockResolvedValueOnce(jsonResponse(409, serverRecord));

    const result = await useCampaignPersistenceStore.getState().saveCampaign();

    expect(result).toMatchObject({ status: 'conflict', retriedConflict: true });
    expect(mockStore.getState().campaign?.currentDate.toISOString()).toBe(
      '3025-01-01T00:00:00.000Z',
    );
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(2);
    expect(
      useCampaignPersistenceStore
        .getState()
        .lastPersistedCampaign?.currentDate.toISOString(),
    ).toBe('3025-01-01T00:00:00.000Z');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('rolled back'),
        variant: 'error',
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // Offline non-fatal error
  // ---------------------------------------------------------------------------

  it('an offline save failure is non-fatal — saveState becomes error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await useCampaignPersistenceStore.getState().saveCampaign();

    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('error');
    expect(state.errorMessage).toBe('network down');
  });

  it('clearError returns an errored store to idle', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    await useCampaignPersistenceStore.getState().saveCampaign();
    useCampaignPersistenceStore.getState().clearError();
    expect(useCampaignPersistenceStore.getState().saveState).toBe('idle');
  });

  // ---------------------------------------------------------------------------
  // Save metadata (task 5.3)
  // ---------------------------------------------------------------------------

  it('save metadata updates after a successful save', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-meta', 1);
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, stored));

    await useCampaignPersistenceStore.getState().saveCampaign();

    const metadata = useCampaignPersistenceStore.getState().metadata;
    expect(metadata.lastSavedAt).toBe(stored.savedAt);
    expect(metadata.originDeviceId).toBe('device-meta');
    expect(metadata.version).toBe(1);
  });

  it('manual saveCampaign forces an immediate write without the debounce', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-x', 1);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, stored));

    await useCampaignPersistenceStore.getState().saveCampaign();

    // Issued immediately — no timer advance needed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('saveCampaign includes the matching roster projection in the server envelope', async () => {
    seedRosterProjection(campaign.id);
    const putBodies: Array<{
      envelope: SerializedCampaign;
      baseVersion: number;
    }> = [];
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (_input, init) => {
        const putBody = JSON.parse(
          String((init as RequestInit).body),
        ) as (typeof putBodies)[number];
        putBodies.push(putBody);
        return jsonResponse(200, putBody.envelope);
      });

    await useCampaignPersistenceStore.getState().saveCampaign();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(putBodies).toHaveLength(1);
    const savedPutBody = putBodies[0];
    expect(savedPutBody.envelope.body.rosterProjection).toBeDefined();
    expect(savedPutBody.envelope.body.rosterProjection?.campaignId).toBe(
      campaign.id,
    );
    expect(savedPutBody.envelope.body.rosterProjection?.units[0]).toMatchObject(
      {
        unitId: 'unit-atlas-as7d',
        unitName: 'Atlas AS7-D',
        readiness: 'Damaged',
      },
    );
    expect(
      savedPutBody.envelope.body.rosterProjection?.pilots[0].hireDate,
    ).toBe('3025-01-01T00:00:00.000Z');
    expect(
      savedPutBody.envelope.body.rosterProjection?.missions[0].deployedUnitIds,
    ).toEqual(['unit-atlas-as7d']);
  });
});
