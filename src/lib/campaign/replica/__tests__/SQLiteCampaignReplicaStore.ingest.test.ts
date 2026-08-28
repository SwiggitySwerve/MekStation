/**
 * Replica ingest idempotence and fail-closed identity faults (task 2.3).
 *
 * Re-ingesting stored items is a no-op. A gap, a collision, and a
 * foreign epoch fail typed and do not mutate rows or folded state.
 */

import { canonicalizeCampaignJson } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';

import { CAMPAIGN_REPLICA_STREAM_TYPE } from '../campaignReplicaTypes';
import { campaignReplicaStreamId } from '../campaignReplicaTypes';
import {
  CAMPAIGN_ID,
  EPOCH_A,
  EPOCH_B,
  GRANT_ID,
  closeCampaignReplicaHarness,
  countJournalStream,
  openCampaignReplicaHarness,
  replicaFundsItem,
  replicaFundsPage,
} from './replicaTestHarness';

describe('SQLiteCampaignReplicaStore ingest', () => {
  it('re-ingesting the same items is a no-op for rows and state', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      const items = replicaFundsPage(CAMPAIGN_ID, 1, 3);
      const first = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items,
      });
      expect(first.kind).toBe('applied');
      if (first.kind !== 'applied') return;
      expect(first.appended).toBe(3);
      const rows = await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID);
      const before = await harness.store.readReplicaState(
        CAMPAIGN_ID,
        GRANT_ID,
      );
      const beforeBytes = canonicalizeCampaignJson(before.state);

      const second = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items,
      });
      expect(second.kind).toBe('duplicate');
      expect(await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID)).toBe(
        rows,
      );
      const after = await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID);
      expect(canonicalizeCampaignJson(after.state)).toBe(beforeBytes);
      expect(
        countJournalStream(
          CAMPAIGN_REPLICA_STREAM_TYPE,
          campaignReplicaStreamId(CAMPAIGN_ID, GRANT_ID),
        ),
      ).toBe(rows);
      expect(countJournalStream('campaign')).toBe(0);
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('fails closed on a gap and does not write the page', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: [replicaFundsItem(CAMPAIGN_ID, 1, 'ONE')],
      });
      const before = await harness.store.readReplicaState(
        CAMPAIGN_ID,
        GRANT_ID,
      );
      const rows = await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID);
      const gap = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: [replicaFundsItem(CAMPAIGN_ID, 3, 'THREE')],
      });
      expect(gap.kind).toBe('gap');
      if (gap.kind !== 'gap') return;
      expect(gap.reason).toBe('delivery-gap');
      expect(gap.lastVerifiedCursor).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 1,
      });
      expect(await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID)).toBe(
        rows,
      );
      expect(
        canonicalizeCampaignJson(
          (await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID)).state,
        ),
      ).toBe(canonicalizeCampaignJson(before.state));
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('fails closed on a mixed page that would apply a prefix then gap', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      const mixed = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: [
          replicaFundsItem(CAMPAIGN_ID, 1, 'ONE'),
          replicaFundsItem(CAMPAIGN_ID, 2, 'TWO'),
          replicaFundsItem(CAMPAIGN_ID, 4, 'FOUR'),
        ],
      });
      expect(mixed.kind).toBe('gap');
      if (mixed.kind !== 'gap') return;
      expect(mixed.reason).toBe('delivery-gap');
      expect(mixed.lastVerifiedCursor.afterSequence).toBe(0);
      expect(await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID)).toBe(
        0,
      );
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('fails closed on a head collision without replacing replica state', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: [replicaFundsItem(CAMPAIGN_ID, 1, 'ONE')],
      });
      const before = await harness.store.readReplicaState(
        CAMPAIGN_ID,
        GRANT_ID,
      );
      const rows = await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID);
      const collision = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: [replicaFundsItem(CAMPAIGN_ID, 1, 'OTHER-IDENTITY')],
      });
      expect(collision.kind).toBe('collision');
      if (collision.kind !== 'collision') return;
      expect(collision.reason).toBe('delivery-collision');
      expect(collision.lastVerifiedCursor).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 1,
      });
      expect(await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID)).toBe(
        rows,
      );
      expect(
        (await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID)).state
          .balance,
      ).toBe(before.state.balance);
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('fails closed on a historical collision at an earlier sequence', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: replicaFundsPage(CAMPAIGN_ID, 1, 3),
      });
      const rows = await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID);
      const collision = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: [replicaFundsItem(CAMPAIGN_ID, 1, 'COLLIDE-EARLY', 99)],
      });
      expect(collision.kind).toBe('collision');
      if (collision.kind !== 'collision') return;
      expect(collision.reason).toBe('delivery-collision');
      expect(await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID)).toBe(
        rows,
      );
      expect(
        (await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID)).state
          .balance,
      ).toBe(3);
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('fails closed on a foreign epoch without applying the item', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: [replicaFundsItem(CAMPAIGN_ID, 1, 'ONE')],
      });
      const rows = await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID);
      const foreign = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_B,
        items: [replicaFundsItem(CAMPAIGN_ID, 2, 'TWO')],
      });
      expect(foreign.kind).toBe('foreign-epoch');
      if (foreign.kind !== 'foreign-epoch') return;
      expect(foreign.reason).toBe('delivery-foreign-epoch');
      expect(foreign.lastVerifiedCursor).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 1,
      });
      expect(await harness.store.storedEventCount(CAMPAIGN_ID, GRANT_ID)).toBe(
        rows,
      );
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });
});
