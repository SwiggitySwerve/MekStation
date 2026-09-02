/**
 * Non-inference proof for per-grant campaign projection (task 3.2).
 *
 * A campaign-scope grant must receive contiguous sequences for in-scope
 * events only. Serialized delivery must not contain withheld payload
 * markers or journal position/digest fields. Two streams with the same
 * in-scope events and different withheld counts must be byte-identical
 * after campaign ids are normalized, so the delivered count cannot
 * reveal how many events were withheld.
 */

import { leakScan } from '@/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers';

import { createGmGrantScopes } from '../../grants/campaignGrantGuards';
import {
  CAMPAIGN_GRANT_PROJECTOR_VERSION,
  DELIVERY_EPOCH_STALE_MESSAGE,
} from '../campaignDeliveryTypes';
import { projectCampaignStreamForGrant } from '../projectCampaignStreamForGrant';
import {
  PARTICIPANT_GM,
  PARTICIPANT_PLAYER,
  appendScopeScript,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  mappingCount,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from './grantProjectionHarness';

const VISIBLE_ONE = 'VISIBLE-CAMPAIGN-1';
const VISIBLE_TWO = 'VISIBLE-CAMPAIGN-2';
const VISIBLE_THREE = 'VISIBLE-CAMPAIGN-3';
const WITHHELD_GM = 'WITHHELD-GM-SECRET';
const WITHHELD_GM_B = 'WITHHELD-GM-BURST';

const INTERLEAVE_A: readonly {
  readonly scope: 'campaign' | 'gm';
  readonly reason: string;
}[] = [
  { scope: 'campaign', reason: VISIBLE_ONE },
  { scope: 'gm', reason: WITHHELD_GM },
  { scope: 'campaign', reason: VISIBLE_TWO },
  { scope: 'gm', reason: WITHHELD_GM },
  { scope: 'gm', reason: WITHHELD_GM_B },
  { scope: 'campaign', reason: VISIBLE_THREE },
];

const INTERLEAVE_B: readonly {
  readonly scope: 'campaign' | 'gm';
  readonly reason: string;
}[] = [
  { scope: 'campaign', reason: VISIBLE_ONE },
  { scope: 'gm', reason: WITHHELD_GM },
  { scope: 'gm', reason: WITHHELD_GM_B },
  { scope: 'gm', reason: `${WITHHELD_GM}-extra-1` },
  { scope: 'gm', reason: `${WITHHELD_GM}-extra-2` },
  { scope: 'campaign', reason: VISIBLE_TWO },
  { scope: 'gm', reason: `${WITHHELD_GM}-extra-3` },
  { scope: 'campaign', reason: VISIBLE_THREE },
];

function normalizeCampaignIds(serialized: string, campaignId: string): string {
  return serialized.split(campaignId).join('CAMPAIGN');
}

describe('campaignDelivery non-inference', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('delivers adjacent per-grant sequences with no withheld trace', async () => {
    const campaignA = 'campaign-non-inference-a';
    const campaignB = 'campaign-non-inference-b';
    const grantA = issueTestGrant(harness, {
      campaignId: campaignA,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const grantB = issueTestGrant(harness, {
      campaignId: campaignB,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await appendScopeScript(harness, campaignA, INTERLEAVE_A);
    await appendScopeScript(harness, campaignB, INTERLEAVE_B);

    const principal = mintGrantPrincipal(PARTICIPANT_PLAYER);
    const pageA = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: grantA.grantId,
      cursor: null,
    });
    const pageB = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: grantB.grantId,
      cursor: null,
    });

    expect(pageA.kind).toBe('page');
    expect(pageB.kind).toBe('page');
    if (pageA.kind !== 'page' || pageB.kind !== 'page') return;

    expect(
      pageA.items.map(function (item) {
        return item.deliverySequence;
      }),
    ).toEqual([1, 2, 3]);
    expect(
      pageB.items.map(function (item) {
        return item.deliverySequence;
      }),
    ).toEqual([1, 2, 3]);
    expect(
      pageA.items.map(function (item) {
        return item.event.payload;
      }),
    ).toEqual([
      { delta: 0, reason: VISIBLE_ONE, balance: 1 },
      { delta: 0, reason: VISIBLE_TWO, balance: 1 },
      { delta: 0, reason: VISIBLE_THREE, balance: 1 },
    ]);

    const serializedA = JSON.stringify(pageA);
    expect(leakScan(pageA, [WITHHELD_GM, WITHHELD_GM_B])).toEqual([]);
    expect(leakScan(pageB, [WITHHELD_GM, WITHHELD_GM_B])).toEqual([]);
    expect(pageA.items).toHaveLength(3);
    expect(pageB.items).toHaveLength(3);
    expect(
      INTERLEAVE_A.filter(function (step) {
        return step.scope === 'gm';
      }).length,
    ).not.toBe(
      INTERLEAVE_B.filter(function (step) {
        return step.scope === 'gm';
      }).length,
    );
    expect(pageA.items.length).toBe(pageB.items.length);

    const itemsA = normalizeCampaignIds(JSON.stringify(pageA.items), campaignA);
    const itemsB = normalizeCampaignIds(JSON.stringify(pageB.items), campaignB);
    expect(itemsA).toBe(itemsB);

    expect(serializedA).not.toContain(DELIVERY_EPOCH_STALE_MESSAGE);
    expect(typeof pageA.deliveryEpochId).toBe('string');
    expect(pageA.baseline.deliveryEpochId).toBe(pageA.deliveryEpochId);
  });

  it('GM all-scopes grant receives every event as sequences 1 through 6', async () => {
    const campaignId = 'campaign-gm-all-scopes';
    const grant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_GM,
      scopes: createGmGrantScopes(),
    });
    await appendScopeScript(harness, campaignId, INTERLEAVE_A);

    const page = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_GM),
      grantId: grant.grantId,
      cursor: null,
    });
    expect(page.kind).toBe('page');
    if (page.kind !== 'page') return;
    expect(
      page.items.map(function (item) {
        return item.deliverySequence;
      }),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(
      page.items.map(function (item) {
        return item.event.scope;
      }),
    ).toEqual(['campaign', 'gm', 'campaign', 'gm', 'gm', 'campaign']);
    const serialized = JSON.stringify(page);
    expect(serialized).toContain(WITHHELD_GM);
    expect(serialized).toContain(WITHHELD_GM_B);
    expect(page.items).toHaveLength(INTERLEAVE_A.length);
    expect(CAMPAIGN_GRANT_PROJECTOR_VERSION).toBe(1);
  });
});
