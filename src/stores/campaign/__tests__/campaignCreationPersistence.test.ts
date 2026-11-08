import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

/** @spec openspec/changes/fix-campaign-creation-recovery/specs/campaign-persistence/spec.md */
describe('campaign creation persistence isolation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    resetCampaignStore();
  });

  afterEach(() => {
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
            coopSession: createHostCoopSession('ROOMBB', 'match-b'),
          }),
    ],
    [
      'guest mirror',
      () =>
        useCampaignStore().getState().createGuestMirrorCampaign('match-b', {
          campaignId: 'host-campaign-b',
          campaignName: 'Bravo',
          factionId: 'mercenary',
          roomCode: 'ROOMBB',
        }),
    ],
  ] as const;

  describe.each(creators)('%s', (_name, create) => {
    it('refuses dirty A without changing A, its edit sequence, or pending work', () => {
      const store = useCampaignStore();
      const id = store.getState().createCampaign('Alpha', 'mercenary');
      store.getState().updateCampaign({ description: 'Unsaved Alpha edit' });
      useCampaignPersistenceStore.setState({ campaignId: id, baseVersion: 4 });
      useCampaignPersistenceStore.getState().markDirty();
      const before = store.getState();
      const persistence = useCampaignPersistenceStore.getState();
      const storage = localStorage.getItem('campaign-store');
      const timerCount = jest.getTimerCount();

      expect(create).toThrow(
        'Your current campaign is still saving. Try again in a moment.',
      );

      expect(store.getState()).toBe(before);
      expect(useCampaignPersistenceStore.getState()).toBe(persistence);
      expect(useCampaignPersistenceStore.getState().editSeq).toBe(
        persistence.editSeq,
      );
      expect(localStorage.getItem('campaign-store')).toBe(storage);
      expect(jest.getTimerCount()).toBe(timerCount);
    });

    it('refuses while A is saving without resetting its state', () => {
      const store = useCampaignStore();
      const id = store.getState().createCampaign('Alpha', 'mercenary');
      useCampaignPersistenceStore.setState({
        campaignId: id,
        saveState: 'saving',
      });
      const before = store.getState();
      const persistence = useCampaignPersistenceStore.getState();

      expect(create).toThrow();
      expect(store.getState()).toBe(before);
      expect(useCampaignPersistenceStore.getState()).toBe(persistence);
    });

    it('creates B from clean A with fresh persistence and preserves guest identity', () => {
      const store = useCampaignStore();
      const alphaId = store.getState().createCampaign('Alpha', 'mercenary');
      const alpha = store.getState().campaign;
      useCampaignPersistenceStore.setState({
        campaignId: alphaId,
        baseVersion: 7,
        editSeq: 9,
        saveState: 'saved',
        lastPersistedCampaign: alpha,
      });

      const bravoId = create();

      expect(store.getState().campaign?.id).toBe(bravoId);
      expect(bravoId).not.toBe(alphaId);
      if (_name === 'guest mirror') expect(bravoId).toBe('host-campaign-b');
      expect(useCampaignPersistenceStore.getState()).toMatchObject({
        campaignId: bravoId,
        baseVersion: 0,
        editSeq: 0,
        dirty: false,
        saveState: 'idle',
        lastPersistedCampaign: null,
        sourceReplayFence: null,
      });
      expect(alpha?.name).toBe('Alpha');
    });

    it('refuses an unreconciled discard flush even if dirty is cleared', () => {
      const store = useCampaignStore();
      store.getState().createCampaign('Alpha', 'mercenary');
      jest.spyOn(global, 'fetch').mockResolvedValue({} as Response);
      useCampaignPersistenceStore.getState().markDirty();
      useCampaignPersistenceStore.getState().flushPendingMutations();
      // Isolate the module-owned flush marker from the public dirty flag.
      useCampaignPersistenceStore.setState({ dirty: false });
      const before = store.getState();
      const persistence = useCampaignPersistenceStore.getState();

      expect(create).toThrow();
      expect(store.getState()).toBe(before);
      expect(useCampaignPersistenceStore.getState()).toBe(persistence);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('refuses while a post-flush reconciliation read is pending', async () => {
      const store = useCampaignStore();
      store.getState().createCampaign('Alpha', 'mercenary');
      const campaign = store.getState().campaign!;
      const record: SerializedCampaign = buildSerializedCampaign(
        campaign,
        'device-a',
        1,
      );
      let finishRead: (response: Response) => void = () => {
        throw new Error('Read not started');
      };
      const read = new Promise<Response>((resolve) => {
        finishRead = resolve;
      });
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({} as Response)
        .mockReturnValueOnce(read)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => record,
        } as Response);
      useCampaignPersistenceStore.getState().markDirty();
      useCampaignPersistenceStore.getState().flushPendingMutations();
      useCampaignPersistenceStore.getState().reconcileAfterDiscardFlush();
      useCampaignPersistenceStore.setState({ dirty: false });
      const before = store.getState();

      expect(create).toThrow();
      expect(store.getState()).toBe(before);
      finishRead({ ok: true, json: async () => record } as Response);
      // The ordinary save waits for reconciliation and clears its timer.
      await useCampaignPersistenceStore.getState().saveCampaign();
    });
  });
});
