/**
 * The genesis baseline: two arms, one committed stream, two answers
 * (umbrella 12.2, the first cross-surface parity target).
 *
 * Seam 1 gave the legacy session a per-viewer projection and stated the
 * snapshot law as an ORDERING rule: a full-state baseline may be folded
 * for a restricted viewer while nothing withheld precedes it, which
 * keeps the shared opening ledger shared. `projectCampaignStreamForGrant`
 * (projectCampaignStreamForGrant.ts:254-266) states the same danger and
 * answers it with a BLANKET rule: a partially-scoped grant receives no
 * full-state snapshot at all, genesis included.
 *
 * Seam 1's header called the grant form "the conservative form of the
 * same law". These rows are the probe that checks that claim instead of
 * asserting it - and it does not survive: the two arms hand the same
 * player different opening ledgers from the same committed stream. The
 * rows below pin each arm's real behaviour, and the parity row that
 * should hold is marked failing rather than papered over, because
 * reconciling them needs a fact neither arm has (see its comment).
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { campaignViewerStateDigest } from '@/lib/campaign/sync/campaignViewerProjection';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import {
  createEmptyCampaignState,
  type ICampaignAuthoritativeState,
} from '@/types/campaign/CampaignSync';

import { buildScopedCampaignSnapshot } from '../buildScopedCampaignSnapshot';
import {
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  fundsEvent,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
  PARTICIPANT_PLAYER,
} from './grantProjectionHarness';

const CAMPAIGN_ID = 'campaign-genesis-arm-parity';
const GM_ID = 'gm-player';
const OPENING_BALANCE = 500_000;
/** Present only in the genesis ledger - the marker the arms differ on. */
const OPENING_PILOT_ID = 'pilot-in-the-opening-ledger';
const NOW_ISO = '2026-08-22T16:45:00.000Z';

/** The shared opening ledger both arms start their campaign from. */
function openingState(): ICampaignAuthoritativeState {
  return {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    balance: OPENING_BALANCE,
    pilots: {
      [OPENING_PILOT_ID]: { pilotId: OPENING_PILOT_ID, name: 'Founder' },
    },
  };
}

/**
 * The legacy arm: a real host and session over the surviving log. The
 * host's `open` mints the genesis row from `initialState`, so the stream
 * is genuinely the one production commits, not a hand-built fixture.
 */
async function legacyArmBaselineState(): Promise<ICampaignAuthoritativeState> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: GM_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: openingState(),
  });
  const session = new CampaignSyncSession(host);
  const roomCode = await session.open();
  await host._commitEventsForTests([
    {
      type: 'FundsChanged',
      campaignId: CAMPAIGN_ID,
      ts: NOW_ISO,
      authorPlayerId: GM_ID,
      scope: 'campaign',
      payload: { delta: 0, reason: 'shared-one', balance: 1 },
    },
    {
      type: 'FundsChanged',
      campaignId: CAMPAIGN_ID,
      ts: NOW_ISO,
      authorPlayerId: GM_ID,
      scope: 'gm',
      payload: { delta: 0, reason: 'withheld-one', balance: 2 },
    },
  ]);

  const seen: ICampaignEvent[] = [];
  const join = await session.joinGuest(
    roomCode,
    (event) => seen.push(event),
    PARTICIPANT_PLAYER,
  );
  if (!join.ok) throw new Error('legacy arm refused the join');
  const baseline = seen.find(
    (event) => event.type === 'CampaignSnapshotPublished',
  ) as ICampaignEvent<'CampaignSnapshotPublished'> | undefined;
  if (baseline === undefined) throw new Error('legacy arm sent no baseline');
  return baseline.payload.state;
}

describe('genesis baseline across the legacy and grant arms', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  /** The grant arm over the same three committed facts. */
  async function grantArmSnapshotState(): Promise<ICampaignAuthoritativeState> {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await appendCampaignEvent(harness, {
      type: 'CampaignSnapshotPublished',
      sequence: 0,
      campaignId: CAMPAIGN_ID,
      ts: NOW_ISO,
      authorPlayerId: GM_ID,
      scope: 'campaign',
      payload: { state: openingState() },
    });
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 1, 'campaign', 'shared-one'),
    );
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 2, 'gm', 'withheld-one'),
    );
    const built = await buildScopedCampaignSnapshot(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: grant.grantId,
      nowIso: NOW_ISO,
    });
    if (built.kind !== 'snapshot') {
      throw new Error(`grant arm refused the snapshot: ${built.kind}`);
    }
    return built.snapshot.state;
  }

  it('both arms withhold the gm-scoped fact from the same player', async () => {
    // The control. Whatever the arms disagree about, it is NOT the
    // thing scope exists to decide - both withhold `withheld-one`.
    const legacy = await legacyArmBaselineState();
    const grant = await grantArmSnapshotState();
    expect(legacy.balance).not.toBe(2);
    expect(grant.balance).not.toBe(2);
  });

  it('the legacy arm folds the opening ledger into the player baseline', async () => {
    const legacy = await legacyArmBaselineState();
    expect(Object.keys(legacy.pilots)).toContain(OPENING_PILOT_ID);
  });

  it('the grant arm withholds the opening ledger from the same player', async () => {
    const grant = await grantArmSnapshotState();
    // Not a bug on this side: projectCampaignStreamForGrant:264 drops
    // every full-state snapshot for a partially-scoped grant, because a
    // stored baseline CAN carry material the grant was never delivered
    // (campaignGrantSnapshot.storedBaselineLeak proves that threat with
    // a genesis row carrying a withheld pilot). It cannot tell this
    // genesis from that one.
    expect(Object.keys(grant.pilots)).not.toContain(OPENING_PILOT_ID);
  });

  it.failing(
    'the same player gets the same state digest from both arms',
    async () => {
      // WHY THIS IS FAILING RATHER THAN FIXED. Making the arms agree
      // soundly needs a fact neither carries: whether a full-state
      // baseline is a GENESIS (minted at open from the shared starting
      // ledger - CampaignMatchHost.open, scope `campaign`, provably
      // pre-scope) or an IMPORTED/MIGRATION baseline (an existing
      // campaign's whole state, which can contain material a restricted
      // viewer may not see). Both are `CampaignSnapshotPublished`,
      // stamped `campaign`, with identical shape.
      //
      // So neither arm can be simply moved to the other: relaxing the
      // grant rule re-opens the storedBaselineLeak threat, and adopting
      // the grant rule on the legacy arm makes every restricted viewer
      // start from an empty campaign and lose facts nothing withheld.
      // The distinguishing fact is a schema addition on the baseline
      // event, owned by the campaign-journal migration work
      // (design-campaign-authority-and-sync D10 / task 5.2 authority
      // migration states), not by a parity slice.
      //
      // Pinned as failing so the divergence cannot change silently and
      // flips green from EITHER reconciliation.
      const legacy = await legacyArmBaselineState();
      const grant = await grantArmSnapshotState();
      expect(campaignViewerStateDigest(grant)).toBe(
        campaignViewerStateDigest(legacy),
      );
    },
  );
});
