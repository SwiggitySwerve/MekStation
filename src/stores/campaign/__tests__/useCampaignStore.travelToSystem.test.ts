/**
 * useCampaignStore.travelToSystem tests
 *
 * Per `wire-starmap-into-campaign` (Wave 6.4): the travel action mutates
 * `campaign.currentSystemId` and emits a 'travel' activity-log entry.
 * These tests cover the four behaviour contracts spelled out in
 * the spec:
 *
 *   1. Happy path — known seed id, different from current
 *   2. Same-system no-op — selected id == campaign.currentSystemId
 *   3. Unknown id — silently rejected, no mutation, no log entry
 *   4. Legacy-campaign default — undefined currentSystemId treated as Terra
 *
 * The activity-log dedup behaviour (FIFO + last-write-wins on id
 * collision) is already covered by the appendActivityLogEntry suite —
 * this file focuses on the action's wiring + invariants.
 *
 * @spec openspec/changes/wire-starmap-into-campaign/specs/starmap-interface/spec.md
 */

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

  it('travels to a known system on happy path and emits one travel log entry', () => {
    const store = freshStoreWithCampaign();
    const beforeLog = store.getState().activityLog.length;
    const result = store.getState().travelToSystem('luthien');
    expect(result).toBe(true);
    expect(store.getState().campaign?.currentSystemId).toBe('luthien');
    const log = store.getState().activityLog;
    expect(log.length).toBe(beforeLog + 1);
    const last = log[log.length - 1];
    expect(last.category).toBe('travel');
    // Discriminated union narrows on the category check above.
    if (last.category === 'travel') {
      expect(last.payload.event).toBe('jump');
      expect(last.payload.toSystemId).toBe('luthien');
      expect(last.payload.toSystemName).toBe('Luthien');
      // Legacy-default: untravelled campaigns leave from Terra.
      expect(last.payload.fromSystemId).toBe('terra');
    }
  });

  it('treats undefined currentSystemId as Terra (legacy no-op)', () => {
    const store = freshStoreWithCampaign();
    expect(store.getState().campaign?.currentSystemId).toBeUndefined();
    // Travel to Terra from the implicit Terra default should no-op.
    const result = store.getState().travelToSystem('terra');
    expect(result).toBe(false);
  });

  it('no-ops when destination equals current system', () => {
    const store = freshStoreWithCampaign();
    expect(store.getState().travelToSystem('luthien')).toBe(true);
    const beforeLog = store.getState().activityLog.length;
    const result = store.getState().travelToSystem('luthien');
    expect(result).toBe(false);
    // No additional log entry — dedup or not, the action should not
    // even emit when the destination is the current system.
    expect(store.getState().activityLog.length).toBe(beforeLog);
  });

  it('emits fromSystemId reflecting the previous location across two jumps', () => {
    const store = freshStoreWithCampaign();
    store.getState().travelToSystem('luthien'); // terra → luthien
    store.getState().travelToSystem('sian'); // luthien → sian
    const log = store.getState().activityLog;
    const last = log[log.length - 1];
    if (last.category === 'travel') {
      expect(last.payload.fromSystemId).toBe('luthien');
      expect(last.payload.toSystemId).toBe('sian');
    } else {
      throw new Error('Last entry should be a travel entry');
    }
  });
});
