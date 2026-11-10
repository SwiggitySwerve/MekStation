/**
 * S1b local-storage seam (matrix rows H, I and the outdated-tab rows).
 *
 * Browser storage outlives the code that wrote it: an older tab or a cached
 * older bundle shares it, and reads whatever sits under the keys it knows
 * (`campaign-store`, `missions-<id>`, `campaign-<id>`), spreading contract
 * fields it does not understand. So a campaign holding a contract above this
 * build's reader level is never written under those keys. The full payload goes
 * to `<key>.lifecycle` and the old key holds a tombstone older code reads as an
 * empty store.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import {
  LIFECYCLE_SLOT_SUFFIX,
  dismissOutdatedTabNotice,
  getOutdatedTabNotices,
  lifecycleAwareStorage,
  resetOutdatedTabNotices,
} from '../lifecycleAwareStorage';

function mission(id: string, version?: unknown): [string, unknown] {
  return [
    id,
    {
      id,
      name: id,
      status: 'active',
      ...(version === undefined ? {} : { lifecycleRulesVersion: version }),
    },
  ];
}

function campaignStoreValue(
  campaignId: string,
  missions: [string, unknown][],
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    state: {
      campaign: {
        id: campaignId,
        name: `Name of ${campaignId}`,
        missions,
        ...extra,
      },
      activityLog: [{ id: 'a1' }],
      cachedCampaignKey: { instanceId: 'i', revision: 4 },
    },
    version: 0,
  });
}

const V2 = (): [string, unknown][] => [mission('m-legacy'), mission('m-v2', 2)];
const LEGACY = (): [string, unknown][] => [mission('m-legacy')];

describe('lifecycleAwareStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    resetOutdatedTabNotices();
  });

  describe('a campaign with no contract above the reader level', () => {
    it('writes the exact legacy bytes under the old key and nothing else', () => {
      const value = campaignStoreValue('c1', LEGACY());
      lifecycleAwareStorage.setItem('campaign-store', value);
      expect(localStorage.getItem('campaign-store')).toBe(value);
      expect(localStorage.length).toBe(1);
      expect(lifecycleAwareStorage.getItem('campaign-store')).toBe(value);
    });

    it('treats an explicit rules version 1 as legacy', () => {
      const value = campaignStoreValue('c1', [mission('m1', 1)]);
      lifecycleAwareStorage.setItem('campaign-store', value);
      expect(localStorage.getItem('campaign-store')).toBe(value);
      expect(
        localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`),
      ).toBe(null);
    });

    it('passes a value that is not JSON straight through', () => {
      lifecycleAwareStorage.setItem('campaign-store', 'not json');
      expect(localStorage.getItem('campaign-store')).toBe('not json');
    });
  });

  describe('writer side (row H): a contract above the reader level', () => {
    it('keeps the payload in the slot and leaves a tombstone old code reads as empty (campaign-store)', () => {
      const value = campaignStoreValue('c1', V2());
      lifecycleAwareStorage.setItem('campaign-store', value);

      const slot = JSON.parse(
        localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`) ??
          'null',
      );
      expect(slot.value).toBe(value);
      expect(slot.campaignId).toBe('c1');

      const old = localStorage.getItem('campaign-store') ?? '';
      expect(old).not.toContain('lifecycleRulesVersion');
      expect(old).not.toContain('m-v2');
      const tombstone = JSON.parse(old);
      // Exactly what shipped `merge` resets to an empty store on.
      expect(tombstone.state.campaign).toBeNull();
      expect(tombstone.version).toBe(0);
      expect(tombstone.state.activityLog).toEqual([{ id: 'a1' }]);
      expect(tombstone.lifecycleSlot).toBe(slot.stamp);
    });

    it('tombstones missions-<id> as an empty missions store', () => {
      const value = JSON.stringify({
        state: { missions: V2(), scenarios: [['s1', { id: 's1' }]] },
        version: 0,
      });
      lifecycleAwareStorage.setItem('missions-c1', value);
      const old = JSON.parse(localStorage.getItem('missions-c1') ?? 'null');
      expect(old.state).toEqual({ missions: [], scenarios: [] });
      expect(
        JSON.parse(
          localStorage.getItem(`missions-c1${LIFECYCLE_SLOT_SUFFIX}`) ?? '{}',
        ).value,
      ).toBe(value);
    });

    it('tombstones campaign-<id> as a null state', () => {
      const value = JSON.stringify({
        state: { id: 'c1', name: 'C1', missions: V2() },
      });
      lifecycleAwareStorage.setItem('campaign-c1', value);
      expect(
        JSON.parse(localStorage.getItem('campaign-c1') ?? 'null').state,
      ).toBeNull();
    });

    it('protects a contract-market offer above the reader level', () => {
      const value = campaignStoreValue('c1', LEGACY(), {
        contractMarket: { offers: [{ id: 'o1', lifecycleRulesVersion: 3 }] },
      });
      lifecycleAwareStorage.setItem('campaign-store', value);
      expect(localStorage.getItem('campaign-store')).not.toContain('"o1"');
    });

    it('protects an unreadable version value too (old code would treat it as legacy)', () => {
      lifecycleAwareStorage.setItem(
        'campaign-store',
        campaignStoreValue('c1', [mission('m-odd', 'two')]),
      );
      expect(localStorage.getItem('campaign-store')).not.toContain('m-odd');
    });

    it('reads its own slot back through the tombstone, byte for byte', () => {
      const value = campaignStoreValue('c1', V2());
      lifecycleAwareStorage.setItem('campaign-store', value);
      expect(lifecycleAwareStorage.getItem('campaign-store')).toBe(value);
      expect(getOutdatedTabNotices()).toEqual([]);
    });

    it('writes the slot before the tombstone, so a failure leaves the data', () => {
      const realSet = Storage.prototype.setItem;
      const keys: string[] = [];
      const spy = jest
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(function (this: Storage, key: string, v: string) {
          keys.push(key);
          return realSet.call(this, key, v);
        });
      lifecycleAwareStorage.setItem(
        'campaign-store',
        campaignStoreValue('c1', V2()),
      );
      spy.mockRestore();
      expect(keys).toEqual([
        `campaign-store${LIFECYCLE_SLOT_SUFFIX}`,
        'campaign-store',
      ]);
    });
  });

  describe('reader side (row I): an older tab overwrote the tombstone', () => {
    function clobber(campaignId: string): string {
      const clobbered = campaignStoreValue(campaignId, LEGACY(), {
        name: 'Edited in the old tab',
      });
      localStorage.setItem('campaign-store', clobbered);
      return clobbered;
    }

    beforeEach(() => {
      lifecycleAwareStorage.setItem(
        'campaign-store',
        campaignStoreValue('c1', V2()),
      );
    });

    it('the slot wins for the same campaign and the slot survives', () => {
      const slotBefore = localStorage.getItem(
        `campaign-store${LIFECYCLE_SLOT_SUFFIX}`,
      );
      clobber('c1');
      const read = lifecycleAwareStorage.getItem('campaign-store') ?? '';
      expect(read).toContain('m-v2');
      expect(
        localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`),
      ).toBe(slotBefore);
    });

    it('tells the user, naming the campaign, that outdated-tab changes were not kept', () => {
      clobber('c1');
      lifecycleAwareStorage.getItem('campaign-store');
      expect(getOutdatedTabNotices()).toEqual([
        { campaignId: 'c1', campaignName: 'Name of c1' },
      ]);
    });

    it('keeps the older tab content readable in place (nothing is deleted)', () => {
      const clobbered = clobber('c1');
      lifecycleAwareStorage.getItem('campaign-store');
      expect(localStorage.getItem('campaign-store')).toBe(clobbered);
    });

    it('does not announce twice for the same campaign', () => {
      clobber('c1');
      lifecycleAwareStorage.getItem('campaign-store');
      lifecycleAwareStorage.getItem('campaign-store');
      expect(getOutdatedTabNotices()).toHaveLength(1);
    });

    it('can be dismissed', () => {
      clobber('c1');
      lifecycleAwareStorage.getItem('campaign-store');
      dismissOutdatedTabNotice('c1');
      expect(getOutdatedTabNotices()).toEqual([]);
    });

    it('a different campaign in the old key is not touched: the slot stays an orphan', () => {
      const other = clobber('c-other');
      const slotBefore = localStorage.getItem(
        `campaign-store${LIFECYCLE_SLOT_SUFFIX}`,
      );
      expect(lifecycleAwareStorage.getItem('campaign-store')).toBe(other);
      expect(getOutdatedTabNotices()).toEqual([]);
      expect(
        localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`),
      ).toBe(slotBefore);
    });

    it('an empty store in the old key (campaign closed) is not resurrected', () => {
      const empty = JSON.stringify({
        state: { campaign: null, activityLog: [] },
        version: 0,
      });
      const slotBefore = localStorage.getItem(
        `campaign-store${LIFECYCLE_SLOT_SUFFIX}`,
      );
      localStorage.setItem('campaign-store', empty);
      expect(lifecycleAwareStorage.getItem('campaign-store')).toBe(empty);
      expect(getOutdatedTabNotices()).toEqual([]);
      // Read as it stands, and the slot is kept as an orphan, not deleted.
      expect(
        localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`),
      ).toBe(slotBefore);
    });

    it('missions-<id>: an older tab rewriting its empty store is overruled silently, one with content is announced', () => {
      const missions = JSON.stringify({
        state: { missions: V2(), scenarios: [] },
        version: 0,
      });
      lifecycleAwareStorage.setItem('missions-c1', missions);
      localStorage.setItem(
        'missions-c1',
        JSON.stringify({ state: { missions: [], scenarios: [] }, version: 0 }),
      );
      expect(lifecycleAwareStorage.getItem('missions-c1')).toBe(missions);
      expect(getOutdatedTabNotices()).toEqual([]);

      localStorage.setItem(
        'missions-c1',
        JSON.stringify({
          state: { missions: [mission('m-old-tab')], scenarios: [] },
          version: 0,
        }),
      );
      expect(lifecycleAwareStorage.getItem('missions-c1')).toBe(missions);
      expect(getOutdatedTabNotices()).toEqual([
        { campaignId: 'c1', campaignName: null },
      ]);
    });
  });

  describe('a later write by this build', () => {
    beforeEach(() => {
      lifecycleAwareStorage.setItem(
        'campaign-store',
        campaignStoreValue('c1', V2()),
      );
    });

    it('a new v2 write replaces the slot and restores the tombstone, ending any notice', () => {
      localStorage.setItem(
        'campaign-store',
        campaignStoreValue('c1', LEGACY()),
      );
      lifecycleAwareStorage.getItem('campaign-store');
      expect(getOutdatedTabNotices()).toHaveLength(1);

      const next = campaignStoreValue('c1', [...V2(), mission('m-new')]);
      lifecycleAwareStorage.setItem('campaign-store', next);
      resetOutdatedTabNotices();
      expect(lifecycleAwareStorage.getItem('campaign-store')).toBe(next);
      expect(getOutdatedTabNotices()).toEqual([]);
      expect(localStorage.getItem('campaign-store')).not.toContain('m-v2');
    });

    it('a non-v2 write while a slot exists is a deliberate state: it is read back and does not resurrect the slot', () => {
      const plain = campaignStoreValue('c1', LEGACY());
      lifecycleAwareStorage.setItem('campaign-store', plain);
      const read =
        (lifecycleAwareStorage.getItem('campaign-store') as string | null) ??
        '';
      expect(JSON.parse(read).state.campaign.missions).toEqual(LEGACY());
      expect(getOutdatedTabNotices()).toEqual([]);
      // ...while the slot is kept as an orphan.
      expect(
        localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`),
      ).not.toBeNull();
    });

    it('removeItem never deletes the slot', () => {
      lifecycleAwareStorage.removeItem('campaign-store');
      expect(localStorage.getItem('campaign-store')).toBeNull();
      expect(
        localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`),
      ).not.toBeNull();
      expect(lifecycleAwareStorage.getItem('campaign-store')).toBeNull();
    });
  });

  describe('a damaged slot', () => {
    it('is ignored: the old key is read as it stands', () => {
      localStorage.setItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`, '{nope');
      const value = campaignStoreValue('c1', LEGACY());
      localStorage.setItem('campaign-store', value);
      expect(lifecycleAwareStorage.getItem('campaign-store')).toBe(value);
    });
  });
});
