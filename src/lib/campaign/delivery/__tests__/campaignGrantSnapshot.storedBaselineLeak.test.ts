/**
 * A stored full-state baseline must never be delivered to a partial grant.
 *
 * `applyCampaignEvent` handles `CampaignSnapshotPublished` by REPLACING
 * state wholesale - it is the baseline a joining replica starts from.
 * Task 3.1 stamps those events `campaign`, and both the source genesis
 * and the migration baseline append one carrying the FULL authoritative
 * state. So the scope filter alone does not stop them: a `campaign`-scope
 * grant would pass the check, fold the row, and have every withheld
 * pilot, unit, and figure handed to it in one step - discarding the
 * filtering entirely.
 *
 * The projector therefore delivers a stored baseline only to a grant
 * already entitled to every scope. A restricted grant takes its baseline
 * from the per-grant scoped snapshot (task 3.4), which is folded from
 * in-scope events only and so cannot carry withheld material.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { createGmGrantScopes } from '../../grants/campaignGrantGuards';
import { projectCampaignStreamForGrant } from '../projectCampaignStreamForGrant';
import {
  PARTICIPANT_GM,
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  fundsEvent,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from './grantProjectionHarness';

/** Marker that exists ONLY inside the stored full-state baseline. */
const WITHHELD_PILOT_ID = 'pilot-gm-only-secret-asset';

/**
 * A stored baseline carrying material a `campaign`-scope grant has never
 * been delivered, mirroring a genesis or migration row.
 */
function fullStateBaseline(campaignId: string): ICampaignEvent {
  return Object.freeze({
    type: 'CampaignSnapshotPublished',
    sequence: 0,
    campaignId,
    ts: '2026-08-22T12:00:00.000Z',
    authorPlayerId: 'pid-host',
    // Stamped `campaign` exactly as task 3.1 classifies it.
    scope: 'campaign',
    payload: {
      state: {
        campaignId,
        day: 9,
        balance: 999_999,
        rosterUnits: {},
        pilots: {
          [WITHHELD_PILOT_ID]: {
            pilotId: WITHHELD_PILOT_ID,
            pilotName: 'Withheld Asset',
          },
        },
        contracts: {},
        factionStanding: {},
        salvagePool: 0,
      },
    },
  }) as unknown as ICampaignEvent;
}

describe('stored full-state baseline delivery', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('is withheld from a campaign-scope grant and served to an all-scopes grant', async () => {
    const campaignId = 'campaign-stored-baseline-leak';
    const restricted = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const full = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_GM,
      scopes: createGmGrantScopes(),
    });

    // The baseline occupies sequence 0, so the deltas start at 1 - the
    // harness derives its command id from the sequence and would
    // otherwise collide with the baseline's append.
    await appendCampaignEvent(harness, fullStateBaseline(campaignId));
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 1, 'campaign', 'visible-one'),
    );
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 2, 'gm', 'withheld-one'),
    );

    const restrictedPage = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: restricted.grantId,
      cursor: null,
    });
    const fullPage = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_GM),
      grantId: full.grantId,
      cursor: null,
    });

    expect(restrictedPage.kind).toBe('page');
    expect(fullPage.kind).toBe('page');
    if (restrictedPage.kind !== 'page' || fullPage.kind !== 'page') return;

    // The restricted grant receives its one in-scope delta and NOTHING
    // that would replace its state wholesale.
    expect(restrictedPage.items.map((item) => item.event.type)).not.toContain(
      'CampaignSnapshotPublished',
    );
    expect(JSON.stringify(restrictedPage)).not.toContain(WITHHELD_PILOT_ID);
    // Sequences stay contiguous: withholding the baseline leaves no hole.
    expect(restrictedPage.items.map((item) => item.deliverySequence)).toEqual([
      1,
    ]);

    // Positive control: a grant entitled to every scope still receives the
    // baseline, so the withholding is scope-driven and not a blanket drop.
    expect(fullPage.items.map((item) => item.event.type)).toContain(
      'CampaignSnapshotPublished',
    );
    expect(JSON.stringify(fullPage)).toContain(WITHHELD_PILOT_ID);
  });
});
