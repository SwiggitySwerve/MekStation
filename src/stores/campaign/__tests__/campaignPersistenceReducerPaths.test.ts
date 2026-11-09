/** @spec openspec/changes/route-campaign-save-writers/specs/campaign-persistence/spec.md */
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '../campaignPersistenceWiring';
import {
  captureDayAdvanceSnapshot,
  recordStoredCampaign,
  rollbackDayAdvance,
} from '../dayAdvanceSnapshot';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

describe('external campaign persistence writer ordering', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    uninstallCampaignPersistenceWiring();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    localStorage.clear();
    resetCampaignStore();
  });

  afterEach(() => {
    uninstallCampaignPersistenceWiring();
    useCampaignPersistenceStore.getState().reset();
    resetCampaignStore();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const creators = [
    [
      'solo',
      () => useCampaignStore().getState().createCampaign('Bravo', 'mercenary'),
    ],
    [
      'co-op host',
      () =>
        useCampaignStore()
          .getState()
          .createCampaign('Bravo', 'mercenary', undefined, {
            coopSession: createHostCoopSession('ROOMBB', 'host-match'),
          }),
    ],
    [
      'guest mirror',
      () =>
        useCampaignStore().getState().createGuestMirrorCampaign('host-match', {
          campaignId: 'host-campaign',
          campaignName: 'Bravo',
          factionId: 'mercenary',
          roomCode: 'ROOMBB',
        }),
    ],
  ] as const;

  it.each(creators)(
    'keeps reset and %s campaign-id binding as two observable updates',
    (_name, create) => {
      const alpha = useCampaignStore()
        .getState()
        .createCampaign('Alpha', 'mercenary');
      useCampaignPersistenceStore.setState({
        campaignId: alpha,
        baseVersion: 9,
        editSeq: 12,
        saveState: 'saved',
      });
      const states: unknown[] = [];
      const unsubscribe = useCampaignPersistenceStore.subscribe((state) => {
        states.push([
          state.campaignId,
          state.saveState,
          state.dirty,
          state.editSeq,
          state.baseVersion,
        ]);
      });
      try {
        const bravo = create();
        expect(states).toEqual([
          [null, 'idle', false, 0, 0],
          [bravo, 'idle', false, 0, 0],
        ]);
        expect(useCampaignStore().getState().campaign?.id).toBe(bravo);
      } finally {
        unsubscribe();
      }
    },
  );

  it.each([false, true])(
    'restores only the dirty value after day rollback (previously dirty=%s)',
    (wasDirty) => {
      const store = useCampaignStore();
      store.getState().createCampaign('Alpha', 'mercenary');
      const campaign = store.getState().campaign;
      if (!campaign) throw new Error('Expected the created campaign');
      const snapshot = captureDayAdvanceSnapshot(store.getState, campaign);
      const attempted = { ...campaign, name: 'Attempted day' };
      store.setState({ campaign: attempted });
      recordStoredCampaign(snapshot, attempted);
      installCampaignPersistenceWiring();
      useCampaignPersistenceStore.setState({
        dirty: wasDirty,
        editSeq: 7,
        baseVersion: 4,
        saveState: 'error',
        errorMessage: 'Save failed',
      });
      const states: unknown[] = [];
      const unsubscribe = useCampaignPersistenceStore.subscribe((state) => {
        states.push([
          state.dirty,
          state.editSeq,
          state.saveState,
          state.baseVersion,
        ]);
      });
      try {
        expect(
          rollbackDayAdvance(store.setState, store.getState, snapshot),
        ).toBeNull();
        expect(states).toEqual(
          wasDirty
            ? [[true, 8, 'error', 4]]
            : [
                [true, 8, 'error', 4],
                [false, 8, 'error', 4],
              ],
        );
        expect(store.getState().campaign?.name).toBe('Alpha');
        expect(useCampaignPersistenceStore.getState().errorMessage).toBe(
          'Save failed',
        );
        // The old partial dirty restore leaves the wiring's timer armed. PR3 owns scheduling.
        expect(jest.getTimerCount()).toBe(1);
      } finally {
        unsubscribe();
      }
    },
  );

  it('does not restore persistence over a later selected campaign', () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Alpha', 'mercenary');
    const campaign = store.getState().campaign;
    if (!campaign) throw new Error('Expected the created campaign');
    const snapshot = captureDayAdvanceSnapshot(store.getState, campaign);
    store.getState().createCampaign('Bravo', 'mercenary');
    const held = useCampaignPersistenceStore.getState();
    const observer = jest.fn();
    const unsubscribe = useCampaignPersistenceStore.subscribe(observer);
    try {
      expect(
        rollbackDayAdvance(store.setState, store.getState, snapshot),
      ).toBeNull();
      expect(useCampaignPersistenceStore.getState()).toBe(held);
      expect(observer).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('binds a created identity without resetting other fields or coordination', () => {
    useCampaignPersistenceStore.getState().markDirty();
    useCampaignPersistenceStore.setState({
      baseVersion: 7,
      editSeq: 12,
      saveState: 'error',
      errorMessage: 'Earlier failure',
    });
    const before = useCampaignPersistenceStore.getState();
    const timers = jest.getTimerCount();
    const observer = jest.fn();
    const unsubscribe = useCampaignPersistenceStore.subscribe(observer);
    try {
      useCampaignPersistenceStore
        .getState()
        .initializeCreatedCampaign('created-campaign');
      expect(useCampaignPersistenceStore.getState()).toEqual({
        ...before,
        campaignId: 'created-campaign',
      });
      expect(jest.getTimerCount()).toBe(timers);
      expect(observer).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it.each([
    [false, false, false],
    [false, true, true],
    [true, false, false],
    [true, true, false],
  ] as const)(
    'restores dirty only when needed, with no notification otherwise (before=%s, current=%s)',
    (wasDirty, dirty, shouldRestore) => {
      useCampaignPersistenceStore.getState().markDirty();
      useCampaignPersistenceStore.setState({
        dirty,
        editSeq: 9,
        baseVersion: 4,
        saveState: 'error',
        errorMessage: 'Held failure',
      });
      const before = useCampaignPersistenceStore.getState();
      const timers = jest.getTimerCount();
      const observer = jest.fn();
      const unsubscribe = useCampaignPersistenceStore.subscribe(observer);
      try {
        useCampaignPersistenceStore
          .getState()
          .restoreDirtyAfterRollback(wasDirty);
        if (shouldRestore) {
          expect(useCampaignPersistenceStore.getState()).toEqual({
            ...before,
            dirty: false,
          });
          expect(observer).toHaveBeenCalledTimes(1);
        } else {
          expect(useCampaignPersistenceStore.getState()).toBe(before);
          expect(observer).not.toHaveBeenCalled();
        }
        expect(jest.getTimerCount()).toBe(timers);
      } finally {
        unsubscribe();
      }
    },
  );

  it('restores the captured persistence snapshot after campaign installation without cancelling its timer', () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Alpha', 'mercenary');
    const campaign = store.getState().campaign;
    if (!campaign) throw new Error('Expected the created campaign');
    const record = buildSerializedCampaign(campaign, 'previous-device', 9);
    useCampaignPersistenceStore.setState({
      campaignId: campaign.id,
      dirty: false,
      editSeq: 17,
      baseVersion: 9,
      saveState: 'conflict',
      conflictServerRecord: record,
      saveConflict: {
        reason: 'base-state-unavailable',
        recoveryAction: 'resync-to-active-head',
        conflictingFields: [],
        currentVersion: 9,
      },
      errorMessage: 'Earlier issue',
      saveRefusal: {
        code: 'HOST_TOKEN_REQUIRED',
        reason: 'missing-host-token',
        message: 'Sign in',
      },
      launchConflict: {
        code: 'STALE_REVISION',
        reason: 'Moved',
        activeHead: { branchId: 'main', revision: 5, effectiveGeneration: 2 },
        resyncAction: 'resync-to-active-head',
      },
      metadata: {
        ...useCampaignPersistenceStore.getState().metadata,
        version: 9,
        lastSavedAt: record.savedAt,
      },
      lastPersistedCampaign: campaign,
      legacyUnadopted: true,
      sourceReplayFence: { rootPublicRevision: 5 },
      flushSkip: {
        reason: 'envelope-over-keepalive-cap',
        campaignId: campaign.id,
        byteLength: 70000,
        capBytes: 65536,
      },
    });
    const previous = useCampaignPersistenceStore.getState();
    store.setState({ campaign: { ...campaign, id: 'failed-attempt' } });
    useCampaignPersistenceStore.getState().reset();
    installCampaignPersistenceWiring();
    const states: unknown[] = [];
    const unsubscribe = useCampaignPersistenceStore.subscribe((state) => {
      states.push([state.dirty, state.editSeq, state.baseVersion]);
    });
    try {
      // Match co-op cleanup: reset first, install prior campaign, restore prior persistence.
      store.setState({ campaign });
      useCampaignPersistenceStore
        .getState()
        .restoreAfterFailedCreation(previous);
      expect(states).toEqual([
        [true, 1, 0],
        [false, 17, 9],
      ]);
      expect(useCampaignPersistenceStore.getState()).toEqual(previous);
      expect(useCampaignPersistenceStore.getState().metadata).toBe(
        previous.metadata,
      );
      expect(jest.getTimerCount()).toBe(1);
    } finally {
      unsubscribe();
    }
  });
});
