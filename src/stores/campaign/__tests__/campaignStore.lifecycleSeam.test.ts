/**
 * S1b local-storage seam through the real campaign stores (matrix rows H, I):
 * a campaign holding a contract above the reader level never reaches the keys
 * older code reads, and this build still gets it back after a reload.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { ICampaign } from '@/types/campaign/Campaign';

import { stagedContract } from '@/lib/campaign/contracts/__tests__/contractCompletion.fixtures';
import {
  LIFECYCLE_SLOT_SUFFIX,
  getOutdatedTabNotices,
  resetOutdatedTabNotices,
} from '@/stores/utils/lifecycleAwareStorage';

import { createCampaignStore } from '../useCampaignStore';
import {
  persistCampaignRecord,
  serializeCampaign,
} from '../useCampaignStore.persistence';
import { createMissionsStore } from '../useMissionsStore';

const V2_ID = 'contract-v2';

function withV2Contract(campaign: ICampaign): ICampaign {
  const contract = { ...stagedContract(), id: V2_ID };
  return {
    ...campaign,
    missions: new Map([...campaign.missions, [V2_ID, contract]]),
  } as ICampaign;
}

function everyOldKeyValue(): string {
  return Object.keys(localStorage)
    .filter((key) => !key.endsWith(LIFECYCLE_SLOT_SUFFIX))
    .map((key) => localStorage.getItem(key) ?? '')
    .join('\n');
}

describe('campaign stores over the lifecycle seam', () => {
  beforeEach(() => {
    localStorage.clear();
    resetOutdatedTabNotices();
  });

  it('a campaign with a v2 contract leaves no contract field under the keys older code reads', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Seam Campaign', 'mercenary');
    const campaign = store.getState().campaign as ICampaign;
    store.setState({ campaign: withV2Contract(campaign) });

    expect(everyOldKeyValue()).not.toContain('lifecycleRulesVersion');
    expect(everyOldKeyValue()).not.toContain(V2_ID);
    expect(
      localStorage.getItem(`campaign-store${LIFECYCLE_SLOT_SUFFIX}`),
    ).toContain('lifecycleRulesVersion');
  });

  it('a reload recovers the campaign and its v2 contract from the slot', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Seam Campaign', 'mercenary');
    const campaign = store.getState().campaign as ICampaign;
    store.setState({ campaign: withV2Contract(campaign) });

    const reloaded = createCampaignStore().getState().campaign;
    expect(reloaded?.id).toBe(campaign.id);
    const contract = reloaded?.missions.get(V2_ID) as unknown as {
      lifecycleRulesVersion?: number;
    };
    expect(contract?.lifecycleRulesVersion).toBe(2);
    expect(getOutdatedTabNotices()).toEqual([]);
  });

  it('an older tab that overwrites the tombstone loses to the slot, and the user is told', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Seam Campaign', 'mercenary');
    const campaign = store.getState().campaign as ICampaign;
    store.setState({ campaign: withV2Contract(campaign) });

    // The older tab hydrated an empty store, then wrote this campaign back
    // without the contract (what its processors would have produced).
    localStorage.setItem(
      'campaign-store',
      JSON.stringify({
        state: {
          campaign: serializeCampaign(campaign, [], [], {}),
          activityLog: [],
          cachedCampaignKey: null,
        },
        version: 0,
      }),
    );
    const reloaded = createCampaignStore().getState().campaign;
    expect(reloaded?.missions.has(V2_ID)).toBe(true);
    expect(getOutdatedTabNotices()).toEqual([
      { campaignId: campaign.id, campaignName: 'Seam Campaign' },
    ]);
  });

  it('persistCampaignRecord protects campaign-<id> the same way', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Seam Campaign', 'mercenary');
    const campaign = withV2Contract(store.getState().campaign as ICampaign);
    persistCampaignRecord(campaign, [], [], {});
    expect(
      JSON.parse(localStorage.getItem(`campaign-${campaign.id}`) ?? ''),
    ).toEqual(expect.objectContaining({ state: null }));
    expect(
      localStorage.getItem(`campaign-${campaign.id}${LIFECYCLE_SLOT_SUFFIX}`),
    ).toContain('lifecycleRulesVersion');
  });

  it('the missions store protects missions-<id> and reloads from its slot', () => {
    const campaignId = 'c-missions';
    const first = createMissionsStore(campaignId);
    const contract = { ...stagedContract(), id: V2_ID };
    first.getState().addMission(contract);
    expect(localStorage.getItem(`missions-${campaignId}`)).not.toContain(V2_ID);

    const second = createMissionsStore(campaignId);
    expect(second.getState().missions.has(V2_ID)).toBe(true);
  });

  it('a legacy campaign writes only the old keys, with no marker and no slot', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Legacy Campaign', 'mercenary');
    expect(
      Object.keys(localStorage).filter((k) => k.endsWith('.lifecycle')),
    ).toEqual([]);
    const written = JSON.parse(localStorage.getItem('campaign-store') ?? '{}');
    expect(Object.keys(written).sort()).toEqual(['state', 'version']);
  });
});
