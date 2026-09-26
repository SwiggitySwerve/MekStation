/**
 * projectCampaignStreamForGrant from a kept position (roadmap unit U98).
 *
 * A projection handed the position its previous page stopped at reads only
 * the stream rows after it. Pinned against a fresh full projection: in the
 * same epoch it returns exactly the items the full projection returns
 * after the same cursor (a snapshot after an earlier withheld fact stays
 * withheld, so the latch is carried); in a rebuilt epoch (the generation
 * bumped after the position was taken) the old position is not used and
 * the page equals the full projection.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import { projectCampaignStreamForGrant } from '../projectCampaignStreamForGrant';
import {
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  EVENT_TS,
  fundsEvent,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
  PARTICIPANT_PLAYER,
} from './grantProjectionHarness';

const CAMPAIGN_ID = 'campaign-position';

/** A team:alpha-scoped full-state snapshot at `sequence`. */
function snapshot(sequence: number): ICampaignEvent {
  return {
    type: 'CampaignSnapshotPublished',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: EVENT_TS,
    authorPlayerId: 'pid-host',
    scope: 'team:alpha',
    payload: { state: createEmptyCampaignState(CAMPAIGN_ID) },
  };
}

describe('projectCampaignStreamForGrant from a kept position', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  /** One projection for the player's grant. */
  async function project(
    grantId: string,
    request: Pick<
      Parameters<typeof projectCampaignStreamForGrant>[1],
      'cursor' | 'from'
    >,
  ) {
    const page = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId,
      ...request,
    });
    if (page.kind !== 'page') throw new Error(page.kind);
    return page;
  }

  it('reads on from the position in its epoch and from the start in a rebuilt one', async () => {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['team:alpha'],
    });
    await appendCampaignEvent(harness, snapshot(0));
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 1, 'team:alpha', 'E1'),
    );
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 2, 'campaign', 'E2-withheld'),
    );
    const first = await project(grant.grantId, { cursor: null });
    expect(first.items).toHaveLength(2);
    const cursor = {
      deliveryEpochId: first.deliveryEpochId,
      afterSequence: first.items.at(-1)?.deliverySequence ?? 0,
    };

    // Same epoch: only the rows after the position; the snapshot after the
    // withheld E2 stays withheld because the latch is carried.
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 3, 'team:alpha', 'E3'),
    );
    await appendCampaignEvent(harness, snapshot(4));
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 5, 'team:alpha', 'E5'),
    );
    const kept = await project(grant.grantId, { cursor, from: first.position });
    const full = await project(grant.grantId, { cursor });
    expect(JSON.stringify(kept.items)).toBe(JSON.stringify(full.items));
    expect(
      kept.items.map((item) =>
        item.event.type === 'FundsChanged'
          ? item.event.payload.reason
          : item.event.type,
      ),
    ).toEqual(['E3', 'E5']);

    // A rebuilt epoch: the position taken in the old one is not used.
    const viewer = await harness.resolver.resolve(
      mintGrantPrincipal(PARTICIPANT_PLAYER),
      CAMPAIGN_ID,
    );
    harness.deliveryStore.bumpGeneration(
      viewer.campaignSessionId,
      'campaign',
      CAMPAIGN_ID,
    );
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 6, 'team:alpha', 'E6'),
    );
    const rebuilt = await project(grant.grantId, {
      cursor: null,
      from: kept.position,
    });
    const fresh = await project(grant.grantId, { cursor: null });
    expect(rebuilt.deliveryEpochId).not.toBe(first.deliveryEpochId);
    expect(JSON.stringify(rebuilt.items)).toBe(JSON.stringify(fresh.items));
    expect(rebuilt.items.map((item) => item.deliverySequence)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
});
