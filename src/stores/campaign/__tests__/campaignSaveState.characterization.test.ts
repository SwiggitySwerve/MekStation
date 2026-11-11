/** @spec openspec/changes/extract-campaign-save-reducer/specs/campaign-persistence/spec.md */
import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

function response(status: number, body: unknown): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function deferredResponse() {
  let answer!: (value: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    answer = resolve;
  });
  return { promise, answer };
}

describe('campaign save lifecycle before reducer extraction', () => {
  const campaign = buildPopulatedCampaign();
  const live = createStore(() => ({
    campaign,
    switchCampaign: (next: ICampaign) => live.setState({ campaign: next }),
  }));

  beforeEach(() => {
    jest.useFakeTimers();
    live.setState({ campaign });
    // The registered accessor only needs the live campaign/switch seam here.
    registerCampaignStoreAccessor(
      () =>
        live as unknown as ReturnType<
          Parameters<typeof registerCampaignStoreAccessor>[0]
        >,
    );
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('acknowledges only its captured edit sequence and leaves the newer edit pending', async () => {
    const pending = deferredResponse();
    const record = buildSerializedCampaign(
      campaign,
      'characterization-device',
      1,
    );
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockReturnValue(pending.promise);
    const states: unknown[] = [];
    const unsubscribe = useCampaignPersistenceStore.subscribe((state) => {
      states.push([
        state.saveState,
        state.dirty,
        state.editSeq,
        state.baseVersion,
      ]);
    });
    try {
      useCampaignPersistenceStore.getState().markDirty();
      const saving = useCampaignPersistenceStore.getState().saveCampaign();
      await Promise.resolve();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      live.setState({ campaign: { ...campaign, name: 'Newer local edit' } });
      useCampaignPersistenceStore.getState().markDirty();
      pending.answer(response(200, record));
      await saving;

      expect(states).toEqual([
        ['idle', true, 1, 0],
        ['saving', true, 1, 0],
        ['saving', true, 2, 0],
        ['idle', true, 2, 1],
      ]);
      expect(
        useCampaignPersistenceStore.getState().lastPersistedCampaign?.name,
      ).toBe(campaign.name);
      expect(live.getState().campaign.name).toBe('Newer local edit');
    } finally {
      unsubscribe();
    }
  });

  it('ignores the older acknowledgement payload after a newer load, but settles the save status', async () => {
    const pending = deferredResponse();
    const older = buildSerializedCampaign(
      campaign,
      'characterization-device',
      1,
    );
    const newer = buildSerializedCampaign(
      { ...campaign, name: 'Newer server record' },
      'characterization-device',
      4,
    );
    jest
      .spyOn(global, 'fetch')
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(response(200, newer));
    useCampaignPersistenceStore.getState().markDirty();
    const saving = useCampaignPersistenceStore.getState().saveCampaign();
    await Promise.resolve();
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
    useCampaignPersistenceStore.getState().markDirty();
    pending.answer(response(200, older));
    expect(await saving).toEqual({ status: 'saved', record: older });
    expect(useCampaignPersistenceStore.getState()).toMatchObject({
      saveState: 'idle',
      dirty: true,
      baseVersion: 4,
      metadata: { version: 4 },
      lastPersistedCampaign: { name: 'Newer server record' },
    });
  });

  it('keeps refusal evidence and pending work until clear-error, which only acts from error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      response(403, {
        kind: 'refused',
        code: 'HOST_TOKEN_REQUIRED',
        reason: 'missing-host-token',
        error: 'Sign in as host',
      }),
    );
    useCampaignPersistenceStore.getState().markDirty();
    await useCampaignPersistenceStore.getState().saveCampaign();
    expect(useCampaignPersistenceStore.getState()).toMatchObject({
      saveState: 'error',
      dirty: true,
      editSeq: 1,
      baseVersion: 0,
      errorMessage: 'Sign in as host',
      saveRefusal: { code: 'HOST_TOKEN_REQUIRED' },
    });
    useCampaignPersistenceStore.getState().clearError();
    expect(useCampaignPersistenceStore.getState()).toMatchObject({
      saveState: 'idle',
      dirty: true,
      editSeq: 1,
      errorMessage: null,
      saveRefusal: null,
    });
    const before = useCampaignPersistenceStore.getState();
    useCampaignPersistenceStore.getState().clearError();
    expect(useCampaignPersistenceStore.getState()).toEqual(before);
  });

  it('owns the typed conflict and record together until server adoption', async () => {
    const record: SerializedCampaign = buildSerializedCampaign(
      campaign,
      'characterization-device',
      3,
    );
    jest.spyOn(global, 'fetch').mockResolvedValue(
      response(409, {
        kind: 'conflict',
        current: record,
        currentVersion: 3,
        reason: 'base-state-unavailable',
        recoveryAction: 'resync-to-active-head',
        conflictingFields: [],
      }),
    );
    useCampaignPersistenceStore.getState().markDirty();
    await useCampaignPersistenceStore.getState().saveCampaign();
    useCampaignPersistenceStore.getState().markDirty();
    expect(useCampaignPersistenceStore.getState()).toMatchObject({
      saveState: 'conflict',
      dirty: true,
      editSeq: 2,
      baseVersion: 0,
      conflictServerRecord: record,
      saveConflict: { currentVersion: 3 },
    });
    expect(
      await useCampaignPersistenceStore.getState().resolveConflictTakeServer(),
    ).toBe(true);
    expect(useCampaignPersistenceStore.getState()).toMatchObject({
      saveState: 'saved',
      dirty: false,
      editSeq: 2,
      baseVersion: 3,
      conflictServerRecord: null,
      saveConflict: null,
    });
  });

  it('does not treat a launch-only conflict as an available server record', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const conflict = {
      code: 'STALE_REVISION',
      reason: 'Moved',
      activeHead: { branchId: 'main', revision: 7, effectiveGeneration: 1 },
      resyncAction: 'resync-to-active-head',
    };
    useCampaignPersistenceStore.getState().reportLaunchConflict(conflict);
    expect(
      await useCampaignPersistenceStore.getState().resolveConflictTakeServer(),
    ).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useCampaignPersistenceStore.getState().launchConflict).toEqual(
      conflict,
    );
    useCampaignPersistenceStore.getState().clearLaunchConflict();
    expect(useCampaignPersistenceStore.getState().launchConflict).toBeNull();
  });
});
