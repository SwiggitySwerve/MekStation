import { createCampaignStore } from '../useCampaignStore';

describe('useCampaignStore.travelToSystem', () => {
  function freshStoreWithCampaign(): ReturnType<typeof createCampaignStore> {
    const store = createCampaignStore();
    store.getState().createCampaign('Test Campaign', 'davion');
    return store;
  }

  it('returns false when no campaign is loaded', () => {
    const store = createCampaignStore();
    expect(store.getState().travelToSystem('luthien')).toBe(false);
  });

  it('returns false on unknown systemId without mutating state', () => {
    const store = freshStoreWithCampaign();
    const beforeLog = store.getState().activityLog.length;
    const beforeCurrent = store.getState().campaign?.currentSystemId;
    const result = store.getState().travelToSystem('not-a-real-system');
    expect(result).toBe(false);
    expect(store.getState().campaign?.currentSystemId).toBe(beforeCurrent);
    expect(store.getState().activityLog.length).toBe(beforeLog);
  });

  it('returns false on empty systemId', () => {
    const store = freshStoreWithCampaign();
    expect(store.getState().travelToSystem('')).toBe(false);
  });

  it('previews travel without mutating state', () => {
    const store = freshStoreWithCampaign();
    const before = store.getState().campaign;

    const preview = store.getState().previewTravelToSystem('luthien');

    expect(preview?.status).toBe('ready');
    expect(preview?.afterCampaign?.currentSystemId).toBe('luthien');
    expect(store.getState().campaign?.currentSystemId).toBe(
      before?.currentSystemId,
    );
    expect(store.getState().activityLog).toHaveLength(0);
  });

  it('commits the approved preview and emits travel plus finance log entries', () => {
    const store = freshStoreWithCampaign();
    const beforeLog = store.getState().activityLog.length;
    const preview = store.getState().previewTravelToSystem('luthien');

    const result = store.getState().travelToSystem('luthien');

    expect(result).toBe(true);
    expect(store.getState().campaign?.currentSystemId).toBe('luthien');
    expect(store.getState().campaign?.currentDate.toISOString()).toBe(
      preview?.arrivalDate,
    );
    const log = store.getState().activityLog;
    expect(log.length).toBe(beforeLog + 2);
    expect(log.some((entry) => entry.category === 'finances')).toBe(true);
    const travel = log.find((entry) => entry.category === 'travel');
    expect(travel).toBeDefined();
    if (travel?.category === 'travel') {
      expect(travel.payload.event).toBe('jump');
      expect(travel.payload.toSystemId).toBe('luthien');
      expect(travel.payload.toSystemName).toBe('Luthien');
      expect(travel.payload.fromSystemId).toBe('terra');
    }
  });

  it('treats undefined currentSystemId as Terra (legacy no-op)', () => {
    const store = freshStoreWithCampaign();
    expect(store.getState().campaign?.currentSystemId).toBeUndefined();
    const result = store.getState().travelToSystem('terra');
    expect(result).toBe(false);
  });

  it('no-ops when destination equals current system', () => {
    const store = freshStoreWithCampaign();
    expect(store.getState().travelToSystem('luthien')).toBe(true);
    const beforeLog = store.getState().activityLog.length;
    const result = store.getState().travelToSystem('luthien');
    expect(result).toBe(false);
    expect(store.getState().activityLog.length).toBe(beforeLog);
  });

  it('emits fromSystemId reflecting the previous location across two jumps', () => {
    const store = freshStoreWithCampaign();
    store.getState().travelToSystem('luthien');
    store.getState().travelToSystem('sian');
    const travelEntries = store
      .getState()
      .activityLog.filter((entry) => entry.category === 'travel');
    const last = travelEntries[travelEntries.length - 1];
    if (last?.category === 'travel') {
      expect(last.payload.fromSystemId).toBe('luthien');
      expect(last.payload.toSystemId).toBe('sian');
    } else {
      throw new Error('Last travel entry should be a travel entry');
    }
  });
});
