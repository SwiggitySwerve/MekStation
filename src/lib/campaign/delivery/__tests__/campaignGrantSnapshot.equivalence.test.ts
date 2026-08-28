/**
 * Snapshot-versus-full-scoped-replay equivalence (task 3.4).
 *
 * Every cut 0..head must land the same ledger as replaying the whole
 * projected stream. GM and restricted grants must each be internally
 * equivalent and must land in different states so the proof is not
 * vacuously true of two empty ledgers.
 */

import { createGmGrantScopes } from '../../grants/campaignGrantGuards';
import { campaignJsonEquals } from '../foldCampaignGrantDelivery';
import {
  verifyScopedSnapshotEquivalence,
  verifyScopedSnapshotEquivalenceAtEveryCut,
} from '../verifyScopedSnapshotEquivalence';
import {
  buildInterleavedLedger,
  countInScope,
  SNAPSHOT_PILOT_ALICE,
  SNAPSHOT_WITHHELD_PILOT,
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

describe('scoped snapshot equivalence', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('matches full scoped replay at every cut for a restricted grant', async () => {
    const campaignId = 'campaign-snapshot-every-cut';
    const grant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const ledger = buildInterleavedLedger(campaignId, 3);
    expect(countInScope(ledger, 'campaign')).toBeGreaterThanOrEqual(8);
    expect(countInScope(ledger, 'gm')).toBeGreaterThan(0);
    for (const event of ledger) {
      await appendCampaignEvent(harness, event);
    }

    const proofs = await verifyScopedSnapshotEquivalenceAtEveryCut(
      harness.deps,
      {
        principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
        grantId: grant.grantId,
        nowIso: NOW_ISO,
      },
    );
    expect(proofs.length).toBeGreaterThanOrEqual(9);
    const head = proofs[proofs.length - 1];
    expect(head).toBeDefined();
    if (head === undefined) return;
    expect(head.inScopeCount).toBe(countInScope(ledger, 'campaign'));
    expect(head.asOfDeliverySequence).toBe(head.inScopeCount);
    expect(head.tailLength).toBe(0);
    expect(proofs[0]?.asOfDeliverySequence).toBe(0);
    expect(proofs[0]?.tailLength).toBe(head.inScopeCount);
    for (const proof of proofs) {
      expect(campaignJsonEquals(proof.fullReplay, proof.snapshotPlusTail)).toBe(
        true,
      );
      expect(proof.snapshot.grantId).toBe(grant.grantId);
      expect(proof.snapshot.asOfDeliverySequence).toBe(
        proof.asOfDeliverySequence,
      );
    }
  });

  it('holds for GM and restricted grants with genuinely different states', async () => {
    const campaignId = 'campaign-snapshot-gm-vs-restricted';
    const restricted = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const gm = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_GM,
      scopes: createGmGrantScopes(),
    });
    const ledger = buildInterleavedLedger(campaignId, 2);
    for (const event of ledger) {
      await appendCampaignEvent(harness, event);
    }

    const restrictedHead = await verifyScopedSnapshotEquivalence(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: restricted.grantId,
      asOfDeliverySequence: countInScope(ledger, 'campaign'),
      nowIso: NOW_ISO,
    });
    const gmHead = await verifyScopedSnapshotEquivalence(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_GM),
      grantId: gm.grantId,
      asOfDeliverySequence: ledger.length,
      nowIso: NOW_ISO,
    });

    expect(
      campaignJsonEquals(
        restrictedHead.fullReplay,
        restrictedHead.snapshotPlusTail,
      ),
    ).toBe(true);
    expect(campaignJsonEquals(gmHead.fullReplay, gmHead.snapshotPlusTail)).toBe(
      true,
    );
    expect(
      campaignJsonEquals(restrictedHead.fullReplay, gmHead.fullReplay),
    ).toBe(false);
    expect(restrictedHead.fullReplay.pilots[SNAPSHOT_PILOT_ALICE]).toEqual({
      pilotId: SNAPSHOT_PILOT_ALICE,
      name: 'Alice',
    });
    expect(gmHead.fullReplay.pilots[SNAPSHOT_WITHHELD_PILOT]).toBeDefined();
    expect(
      restrictedHead.fullReplay.pilots[SNAPSHOT_WITHHELD_PILOT],
    ).toBeUndefined();
    expect(restrictedHead.fullReplay.salvagePool).toBe(50);
    expect(gmHead.fullReplay.salvagePool).toBe(0);
    expect(restrictedHead.fullReplay.balance).toBe(80);
    expect(gmHead.fullReplay.balance).not.toBe(
      restrictedHead.fullReplay.balance,
    );
  });
});
