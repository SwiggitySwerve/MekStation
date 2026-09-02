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

/**
 * The typed 409 the PUT boundary now returns: the reason the base could
 * not be reconstructed, the one safe recovery, and the server's record so
 * take-server still has something to adopt.
 */
function conflictResponse(record: SerializedCampaign): Response {
  return jsonResponse(409, {
    kind: 'conflict',
    reason: 'base-state-unavailable',
    recoveryAction: 'resync-to-active-head',
    conflictingFields: [],
    currentVersion: record.version,
    current: record,
  });
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

  it('a 409 sets saveState to conflict and exposes the server record', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(conflictResponse(serverRecord));

    const result = await useCampaignPersistenceStore.getState().saveCampaign();

    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('conflict');
    expect(state.conflictServerRecord).not.toBeNull();
    expect(state.conflictServerRecord?.version).toBe(5);
    expect(result).toMatchObject({ status: 'conflict' });
  });

  it('resolveConflictTakeServer adopts the server record', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(conflictResponse(serverRecord));
    await useCampaignPersistenceStore.getState().saveCampaign();

    const ok = await useCampaignPersistenceStore
      .getState()
      .resolveConflictTakeServer();
    expect(ok).toBe(true);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(5);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('offers no overwrite path back to the server after a 409', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockResolvedValue(conflictResponse(serverRecord));

    await useCampaignPersistenceStore.getState().saveCampaign();

    // Gone from the surface entirely rather than merely unwired: a caller
    // cannot reach the stale-envelope overwrite to resubmit it. This row
    // used to assert the opposite - that keep-local re-PUT the same body
    // at the server's version, which silently discarded whatever the
    // other writer had just committed.
    expect(
      (
        useCampaignPersistenceStore.getState() as unknown as Record<
          string,
          unknown
        >
      ).resolveConflictKeepLocal,
    ).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exposes the typed conflict the server returned, with its recovery action', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(conflictResponse(serverRecord));

    await useCampaignPersistenceStore.getState().saveCampaign();

    expect(useCampaignPersistenceStore.getState().saveConflict).toEqual({
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion: 5,
    });
  });

  it('never resubmits the stale envelope at the server version', async () => {
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
      // The server would ACCEPT a second attempt at version 5 - that is
      // exactly what made the old behaviour dangerous rather than merely
      // noisy. Nothing but the client's own restraint stops the overwrite.
      return putBodies.length === 1
        ? conflictResponse(conflictRecord)
        : jsonResponse(200, accepted);
    });

    const result = await useCampaignPersistenceStore.getState().saveCampaign();

    // One attempt, at the version this client actually held.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(putBodies.map((body) => body.baseVersion)).toEqual([0]);
    expect(result).toMatchObject({ status: 'conflict' });
    expect(useCampaignPersistenceStore.getState().saveState).toBe('conflict');
    // The intervening change is preserved, because nothing overwrote it.
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(0);
  });

  it('a save issued while a load is in flight writes against the loaded version', async () => {
    // Regression: page navigation refetches the campaign head while a page
    // surface saves. `baseVersion` resets to 0 on every page load, so a save
    // that reads it before the load lands sends a version the server moved
    // past - a guaranteed 409 followed by a retry, which is what filled the
    // coop-route smoke run with conflict noise and inflated the stored
    // version on navigation alone.
    const serverRecord = buildSerializedCampaign(campaign, 'device-remote', 7);
    const accepted = buildSerializedCampaign(campaign, 'device-local', 8);
    const putBodies: { baseVersion: number }[] = [];
    let resolveLoad!: (response: Response) => void;
    jest
      .spyOn(global, 'fetch')
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'PUT') {
          putBodies.push(
            JSON.parse(String(init.body)) as { baseVersion: number },
          );
          return Promise.resolve(jsonResponse(200, accepted));
        }
        return new Promise<Response>((resolve) => {
          resolveLoad = resolve;
        });
      });

    const loadPromise = useCampaignPersistenceStore
      .getState()
      .loadCampaign(campaign.id);
    await flushPromises();
    // The save starts while the GET is still outstanding.
    const savePromise = useCampaignPersistenceStore.getState().saveCampaign();
    await flushPromises();
    expect(putBodies).toHaveLength(0);

    resolveLoad(jsonResponse(200, serverRecord));
    await loadPromise;
    await savePromise;

    expect(putBodies.map((body) => body.baseVersion)).toEqual([7]);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('concurrent saves serialize so the second writes against the first result', async () => {
    // Regression: two overlapping writes both read the same `baseVersion`, so
    // the later one always loses the compare-and-swap and 409s even though
    // nothing else touched the record.
    const putBodies: { baseVersion: number }[] = [];
    jest
      .spyOn(global, 'fetch')
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { baseVersion: number };
        putBodies.push(body);
        return Promise.resolve(
          jsonResponse(
            200,
            buildSerializedCampaign(
              campaign,
              'device-local',
              body.baseVersion + 1,
            ),
          ),
        );
      });

    const [first, second] = await Promise.all([
      useCampaignPersistenceStore.getState().saveCampaign(),
      useCampaignPersistenceStore.getState().saveCampaign(),
    ]);

    expect(putBodies.map((entry) => entry.baseVersion)).toEqual([0, 1]);
    expect(first).toMatchObject({ status: 'saved' });
    expect(second).toMatchObject({ status: 'saved' });
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(2);
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
    // Writes are serialized behind the save chain, so the request is issued
    // on a later microtask than the call. Flush to the in-flight request
    // before mutating live state: the scenario under test is a live change
    // AFTER the request is on the wire, not before it is sent.
    await Promise.resolve();
    await Promise.resolve();
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

  it('rolls back a co-op campaign and toasts on the FIRST 409', async () => {
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
    fetchMock.mockResolvedValue(conflictResponse(serverRecord));

    const result = await useCampaignPersistenceStore.getState().saveCampaign();

    // The rollback used to wait for a second refused attempt. There is no
    // second attempt now, so it has to happen here or the co-op client
    // keeps rendering an optimistic change the server rejected.
    expect(result).toMatchObject({ status: 'conflict' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
