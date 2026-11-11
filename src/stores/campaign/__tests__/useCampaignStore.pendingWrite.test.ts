/**
 * The pending-write marker travels WITH the persisted copy.
 *
 * The marker is only evidence if it survives exactly what the copy survives:
 * the real `persist` partialize -> localStorage -> merge cycle a page reload
 * runs. A mocked store cannot show that, so these rows use the real one.
 *
 * @spec openspec/changes/adopt-pending-campaign-write/specs/campaign-persistence/spec.md
 */

import type { IPendingWrite } from '@/lib/campaign/persistence/campaignPendingWrite';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';

import { createCampaignStore } from '../useCampaignStore';

const KEY = 'campaign-store';

const marker: IPendingWrite = {
  campaignId: 'campaign-1',
  baseVersion: 7,
  editSeq: 3,
  flush: { baseVersion: 7, editSeq: 2, digest: 'abc' },
};

describe('campaign store pending-write persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('survives the rehydrate cycle with the copy it describes', () => {
    const first = createCampaignStore();
    first.getState().switchCampaign(buildPopulatedCampaign());
    first.getState().setPendingWrite(marker);

    const reloaded = createCampaignStore();

    expect(reloaded.getState().pendingWrite).toEqual(marker);
    expect(reloaded.getState().campaign).not.toBeNull();
  });

  it('is cleared in storage when the claim is cleared', () => {
    const first = createCampaignStore();
    first.getState().switchCampaign(buildPopulatedCampaign());
    first.getState().setPendingWrite(marker);
    first.getState().setPendingWrite(null);

    expect(createCampaignStore().getState().pendingWrite).toBeNull();
  });

  it('is not persisted without a copy for it to describe', () => {
    const first = createCampaignStore();
    first.getState().setPendingWrite(marker);

    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as {
      state?: { pendingWrite?: unknown };
    };
    expect(stored.state?.pendingWrite).toBeUndefined();
    expect(createCampaignStore().getState().pendingWrite).toBeNull();
  });

  it('treats a malformed stored marker as absent rather than repairing it', () => {
    const first = createCampaignStore();
    first.getState().switchCampaign(buildPopulatedCampaign());
    first.getState().setPendingWrite(marker);
    const stored = JSON.parse(localStorage.getItem(KEY) as string) as {
      state: { pendingWrite: unknown };
    };
    stored.state.pendingWrite = { campaignId: 'c', baseVersion: 'seven' };
    localStorage.setItem(KEY, JSON.stringify(stored));

    expect(createCampaignStore().getState().pendingWrite).toBeNull();
  });

  it('loads a copy persisted before markers existed, with no claim', () => {
    const first = createCampaignStore();
    first.getState().switchCampaign(buildPopulatedCampaign());
    const stored = JSON.parse(localStorage.getItem(KEY) as string) as {
      state: Record<string, unknown>;
    };
    delete stored.state.pendingWrite;
    localStorage.setItem(KEY, JSON.stringify(stored));

    const reloaded = createCampaignStore();

    expect(reloaded.getState().campaign).not.toBeNull();
    expect(reloaded.getState().pendingWrite).toBeNull();
  });
});
