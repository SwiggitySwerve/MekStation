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

const JOURNAL_LEAK_KEYS: readonly string[] = [
  'streamRevision',
  'commitPosition',
  'eventDigest',
  'previousStreamEventDigest',
  'commit_position',
  'event_digest',
  'stream_revision',
  'projectedEventIdentity',
  'sequence',
];

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

/** Collects own enumerable keys from a JSON tree. */
function collectKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectKeys(entry, into);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const key of Object.keys(value)) {
    into.add(key);
    collectKeys(Reflect.get(value, key), into);
  }
}

/** True when serialized delivery names a withheld marker or journal field. */
function leakScan(serialized: string, parsed: unknown): readonly string[] {
  const leaks: string[] = [];
  if (serialized.includes(WITHHELD_GM) || serialized.includes(WITHHELD_GM_B)) {
    leaks.push('withheld-payload-marker');
  }
  const keys = new Set<string>();
  collectKeys(parsed, keys);
  for (const key of JOURNAL_LEAK_KEYS) {
    if (keys.has(key)) leaks.push(key);
  }
  return leaks;
}

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
    const serializedB = JSON.stringify(pageB);
    expect(leakScan(serializedA, JSON.parse(serializedA))).toEqual([]);
    expect(leakScan(serializedB, JSON.parse(serializedB))).toEqual([]);
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
