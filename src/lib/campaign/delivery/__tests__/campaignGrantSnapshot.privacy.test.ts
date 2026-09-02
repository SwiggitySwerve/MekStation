/**
 * Snapshot privacy: no withheld markers, no journal keys, no withheld
 * count, and a snapshot built for one grant is refused for another.
 */

import { leakScan } from '@/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers';
import { CampaignGrantSnapshotSchema } from '@/types/multiplayer/Protocol';

import { createGmGrantScopes } from '../../grants/campaignGrantGuards';
import {
  SNAPSHOT_CUT_PAST_HEAD_REASON,
  SNAPSHOT_GRANT_MISMATCH_REASON,
  buildScopedCampaignSnapshot,
  serveScopedCampaignSnapshot,
} from '../buildScopedCampaignSnapshot';
import { canonicalizeCampaignJson } from '../foldCampaignGrantDelivery';
import {
  SNAPSHOT_WITHHELD_GM,
  SNAPSHOT_WITHHELD_GM_B,
  SNAPSHOT_WITHHELD_PILOT,
  buildInterleavedLedger,
  countInScope,
  normalizeSnapshotIds,
} from './campaignGrantSnapshot.test-helpers';
import {
  PARTICIPANT_GM,
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from './grantProjectionHarness';

const NOW_ISO = '2026-08-22T16:30:00.000Z';

describe('scoped snapshot privacy', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('restricted snapshots are leak-free and byte-identical across withheld counts', async () => {
    const campaignA = 'campaign-snapshot-leak-a';
    const campaignB = 'campaign-snapshot-leak-b';
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
    const ledgerA = buildInterleavedLedger(campaignA, 2);
    const ledgerB = buildInterleavedLedger(campaignB, 6);
    expect(countInScope(ledgerA, 'gm')).not.toBe(countInScope(ledgerB, 'gm'));
    expect(countInScope(ledgerA, 'campaign')).toBe(
      countInScope(ledgerB, 'campaign'),
    );
    for (const event of ledgerA) {
      await appendCampaignEvent(harness, event);
    }
    for (const event of ledgerB) {
      await appendCampaignEvent(harness, event);
    }

    const principal = mintGrantPrincipal(PARTICIPANT_PLAYER);
    const builtA = await buildScopedCampaignSnapshot(harness.deps, {
      principal,
      grantId: grantA.grantId,
      nowIso: NOW_ISO,
    });
    const builtB = await buildScopedCampaignSnapshot(harness.deps, {
      principal,
      grantId: grantB.grantId,
      nowIso: NOW_ISO,
    });
    expect(builtA.kind).toBe('snapshot');
    expect(builtB.kind).toBe('snapshot');
    if (builtA.kind !== 'snapshot' || builtB.kind !== 'snapshot') return;

    const serializedA = JSON.stringify(builtA.snapshot);
    // `revision` is this surface's own extra: a snapshot must not carry
    // one, while the streams other callers scan legitimately do.
    const markers = [
      SNAPSHOT_WITHHELD_GM,
      SNAPSHOT_WITHHELD_GM_B,
      SNAPSHOT_WITHHELD_PILOT,
    ];
    expect(leakScan(builtA.snapshot, markers, ['revision'])).toEqual([]);
    expect(leakScan(builtB.snapshot, markers, ['revision'])).toEqual([]);
    expect(serializedA).not.toContain(SNAPSHOT_WITHHELD_GM);

    const comparableA = {
      asOfDeliverySequence: builtA.snapshot.asOfDeliverySequence,
      state: builtA.snapshot.state,
    };
    const comparableB = {
      asOfDeliverySequence: builtB.snapshot.asOfDeliverySequence,
      state: builtB.snapshot.state,
    };
    expect(
      normalizeSnapshotIds(
        canonicalizeCampaignJson(comparableA),
        campaignA,
        grantA.grantId,
        builtA.snapshot.deliveryEpochId,
      ),
    ).toBe(
      normalizeSnapshotIds(
        canonicalizeCampaignJson(comparableB),
        campaignB,
        grantB.grantId,
        builtB.snapshot.deliveryEpochId,
      ),
    );

    const wire = {
      kind: 'CampaignGrantSnapshot' as const,
      matchId: 'match-snapshot-leak',
      ts: NOW_ISO,
      campaignId: campaignA,
      grantId: grantA.grantId,
      deliveryEpochId: builtA.snapshot.deliveryEpochId,
      baseline: builtA.snapshot.baseline,
      asOfDeliverySequence: builtA.snapshot.asOfDeliverySequence,
      event: {
        type: 'CampaignSnapshotPublished' as const,
        campaignId: campaignA,
        ts: NOW_ISO,
        authorPlayerId: builtA.snapshot.authorPlayerId,
        scope: builtA.snapshot.snapshotScope,
        payload: { state: builtA.snapshot.state },
      },
    };
    expect(CampaignGrantSnapshotSchema.safeParse(wire).success).toBe(true);
    expect(
      CampaignGrantSnapshotSchema.safeParse({
        ...wire,
        event: { ...wire.event, sequence: 9 },
      }).success,
    ).toBe(false);
    expect(
      CampaignGrantSnapshotSchema.safeParse({
        ...wire,
        revision: 4,
      }).success,
    ).toBe(false);
  });

  it('refuses to serve a snapshot built for a different grant', async () => {
    const campaignId = 'campaign-snapshot-grant-key';
    const owner = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const other = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_GM,
      scopes: createGmGrantScopes(),
    });
    for (const event of buildInterleavedLedger(campaignId, 1)) {
      await appendCampaignEvent(harness, event);
    }

    const built = await buildScopedCampaignSnapshot(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: owner.grantId,
      nowIso: NOW_ISO,
    });
    expect(built.kind).toBe('snapshot');
    if (built.kind !== 'snapshot') return;
    expect(built.snapshot.grantId).toBe(owner.grantId);
    expect(built.snapshot.grantId).not.toBe(other.grantId);

    const mismatched = serveScopedCampaignSnapshot(
      built.snapshot,
      other.grantId,
    );
    expect(mismatched.kind).toBe('refused');
    if (mismatched.kind !== 'refused') return;
    expect(mismatched.reason).toBe(SNAPSHOT_GRANT_MISMATCH_REASON);

    const matched = serveScopedCampaignSnapshot(built.snapshot, owner.grantId);
    expect(matched.kind).toBe('served');
    if (matched.kind !== 'served') return;
    expect(matched.snapshot).toBe(built.snapshot);

    const pastHead = await buildScopedCampaignSnapshot(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: owner.grantId,
      asOfDeliverySequence: 10_000,
      nowIso: NOW_ISO,
    });
    expect(pastHead.kind).toBe('cut-rejected');
    if (pastHead.kind !== 'cut-rejected') return;
    expect(pastHead.reason).toBe(SNAPSHOT_CUT_PAST_HEAD_REASON);
  });
});
