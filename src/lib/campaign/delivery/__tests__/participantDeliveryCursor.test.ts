/**
 * Durable participant delivery cursors (task 5.5, design D4/D5).
 *
 * Task 5.4 left every cursor in per-socket memory. These rows pin what
 * happens once it is durable, and most of them are about what the
 * record must REFUSE to become:
 *
 * - it must not survive as authority after a revocation,
 * - it must not answer questions the caller cannot ask,
 * - it must not be draggable ahead of what was actually delivered,
 * - and it must not carry a number from one delivery epoch into another.
 *
 * Everything runs against real file-backed SQLite, because "survives a
 * restart" is the whole point and an in-memory double would assert it
 * vacuously.
 */

import type { IParticipantDeliveryCursor } from '../participantDeliveryCursor';

import {
  readParticipantDeliveryCursor,
  recordParticipantAcknowledgement,
} from '../participantDeliveryCursor';
import { projectCampaignStreamForGrant } from '../projectCampaignStreamForGrant';
import {
  EVENT_TS,
  PARTICIPANT_GM,
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  fundsEvent,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
  reopenCampaignDeliveryHarness,
} from './grantProjectionHarness';

const CAMPAIGN_ID = 'campaign-cursors';

describe('durable participant delivery cursors', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  /** Issues a campaign-scope grant and seeds `count` in-scope events. */
  async function seed(count: number) {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    for (let i = 0; i < count; i += 1) {
      await appendCampaignEvent(
        harness,
        fundsEvent(CAMPAIGN_ID, i, 'campaign', `pay-${i}`),
      );
    }
    return grant;
  }

  /** Runs one projection so the epoch exists and sequences are assigned. */
  async function deliver(grantId: string): Promise<string> {
    const projected = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId,
      cursor: null,
    });
    if (projected.kind !== 'page') {
      throw new Error(`expected a page, got ${projected.kind}`);
    }
    return projected.deliveryEpochId;
  }

  function ack(grantId: string, deliveryEpochId: string, sequence: number) {
    return recordParticipantAcknowledgement(
      harness.db,
      harness.deps,
      {
        principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
        grantId,
        deliveryEpochId,
        ackedSequence: sequence,
      },
      EVENT_TS,
    );
  }

  it('records the applied high-water mark', async () => {
    const grant = await seed(3);
    const epoch = await deliver(grant.grantId);

    const result = await ack(grant.grantId, epoch, 2);

    expect(result.kind).toBe('applied');
    const stored = readParticipantDeliveryCursor(harness.db, {
      campaignId: CAMPAIGN_ID,
      grantId: grant.grantId,
      participantId: PARTICIPANT_PLAYER,
    });
    expect(stored).toEqual<IParticipantDeliveryCursor>({
      campaignId: CAMPAIGN_ID,
      grantId: grant.grantId,
      participantId: PARTICIPANT_PLAYER,
      deliveryEpochId: epoch,
      ackedSequence: 2,
    });
  });

  it('refuses to run ahead of what was actually delivered', async () => {
    const grant = await seed(2);
    const epoch = await deliver(grant.grantId);

    const result = await ack(grant.grantId, epoch, 5);

    // A cursor past the high water would skip 3..5 forever on the next
    // resume - the participant would never see events it never got.
    expect(result).toEqual({ kind: 'gap', highestAssigned: 2 });
    expect(
      readParticipantDeliveryCursor(harness.db, {
        campaignId: CAMPAIGN_ID,
        grantId: grant.grantId,
        participantId: PARTICIPANT_PLAYER,
      }),
    ).toBeNull();
  });

  it('treats a re-acknowledgement as ordinary, not as a fault', async () => {
    const grant = await seed(3);
    const epoch = await deliver(grant.grantId);
    await ack(grant.grantId, epoch, 3);

    const again = await ack(grant.grantId, epoch, 1);

    // Retries happen. The cursor only moves forward; going backwards is
    // a no-op rather than an error a client would have to handle.
    expect(again.kind).toBe('stale');
    expect(
      readParticipantDeliveryCursor(harness.db, {
        campaignId: CAMPAIGN_ID,
        grantId: grant.grantId,
        participantId: PARTICIPANT_PLAYER,
      })?.ackedSequence,
    ).toBe(3);
  });

  it('refuses a sequence from a delivery epoch that is not current', async () => {
    const grant = await seed(2);
    const epoch = await deliver(grant.grantId);

    const result = await ack(grant.grantId, 'epoch-from-another-life', 1);

    expect(result).toEqual({ kind: 'foreign-epoch', currentEpochId: epoch });
    expect(
      readParticipantDeliveryCursor(harness.db, {
        campaignId: CAMPAIGN_ID,
        grantId: grant.grantId,
        participantId: PARTICIPANT_PLAYER,
      }),
    ).toBeNull();
  });

  it('stops moving the cursor the moment the grant is revoked', async () => {
    const grant = await seed(3);
    const epoch = await deliver(grant.grantId);
    await ack(grant.grantId, epoch, 1);

    harness.grantStore.revokeGrant(grant.grantId, EVENT_TS);
    const afterRevoke = await ack(grant.grantId, epoch, 3);

    // Revocation must bite at the acknowledgement, not at the next
    // disconnect: a holder who keeps acking would keep a cursor moving
    // through a stream they are no longer entitled to.
    expect(afterRevoke.kind).toBe('not-authorized');
    expect(
      readParticipantDeliveryCursor(harness.db, {
        campaignId: CAMPAIGN_ID,
        grantId: grant.grantId,
        participantId: PARTICIPANT_PLAYER,
      })?.ackedSequence,
    ).toBe(1);
  });

  it('tells a revoked holder exactly what it tells a stranger', async () => {
    const grant = await seed(3);
    const epoch = await deliver(grant.grantId);
    harness.grantStore.revokeGrant(grant.grantId, EVENT_TS);

    const revoked = await ack(grant.grantId, epoch, 2);
    const stranger = await ack('grant-that-never-existed', epoch, 2);

    // Byte-identical refusals. A different shape, code, or extra field
    // for the revoked case would confirm the campaign exists and that
    // this participant once had access to it.
    expect(revoked).toEqual(stranger);
    expect(revoked).toEqual({
      kind: 'not-authorized',
      reason: 'not-authorized',
    });
  });

  it("refuses one participant moving another participant's cursor", async () => {
    const grant = await seed(3);
    const epoch = await deliver(grant.grantId);
    await ack(grant.grantId, epoch, 1);

    // The GM holds their OWN grant on this campaign, so they are a
    // genuine authorized viewer here - just not for THIS grant's cursor.
    // Without their own grant the refusal would come from membership and
    // prove nothing about the participant binding.
    issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_GM,
      scopes: ['campaign', 'gm'],
    });
    // The cursor decides what a resume skips, so moving someone else's
    // is a way to make them miss events without touching their stream.
    const impostor = await recordParticipantAcknowledgement(
      harness.db,
      harness.deps,
      {
        principal: mintGrantPrincipal(PARTICIPANT_GM),
        grantId: grant.grantId,
        deliveryEpochId: epoch,
        ackedSequence: 3,
      },
      EVENT_TS,
    );

    expect(impostor.kind).toBe('not-authorized');
    expect(
      readParticipantDeliveryCursor(harness.db, {
        campaignId: CAMPAIGN_ID,
        grantId: grant.grantId,
        participantId: PARTICIPANT_PLAYER,
      })?.ackedSequence,
    ).toBe(1);
  });

  it('survives a restart of the database', async () => {
    const grant = await seed(4);
    const epoch = await deliver(grant.grantId);
    await ack(grant.grantId, epoch, 3);

    harness = await reopenCampaignDeliveryHarness(harness);

    expect(
      readParticipantDeliveryCursor(harness.db, {
        campaignId: CAMPAIGN_ID,
        grantId: grant.grantId,
        participantId: PARTICIPANT_PLAYER,
      }),
    ).toEqual<IParticipantDeliveryCursor>({
      campaignId: CAMPAIGN_ID,
      grantId: grant.grantId,
      participantId: PARTICIPANT_PLAYER,
      deliveryEpochId: epoch,
      ackedSequence: 3,
    });
  });

  it('lets a slow client keep its place while the stream runs ahead', async () => {
    const grant = await seed(2);
    const epoch = await deliver(grant.grantId);
    await ack(grant.grantId, epoch, 1);

    // The campaign keeps moving; this participant has applied one event.
    for (let i = 2; i < 6; i += 1) {
      await appendCampaignEvent(
        harness,
        fundsEvent(CAMPAIGN_ID, i, 'campaign', `pay-${i}`),
      );
    }
    await deliver(grant.grantId);

    const stored = readParticipantDeliveryCursor(harness.db, {
      campaignId: CAMPAIGN_ID,
      grantId: grant.grantId,
      participantId: PARTICIPANT_PLAYER,
    });
    // The cursor tracks what the PARTICIPANT applied, never what the
    // server sent. Advancing it on delivery would lose everything a
    // slow client had not got to yet.
    expect(stored?.ackedSequence).toBe(1);

    const resumed = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: grant.grantId,
      cursor: { deliveryEpochId: epoch, afterSequence: 1 },
    });
    expect(resumed.kind).toBe('page');
    if (resumed.kind !== 'page') return;
    expect(resumed.items.map((item) => item.deliverySequence)).toEqual([
      2, 3, 4, 5, 6,
    ]);
  });
});
