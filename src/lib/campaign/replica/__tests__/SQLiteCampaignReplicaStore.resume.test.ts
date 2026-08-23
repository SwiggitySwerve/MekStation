/**
 * Replica resume from lastCursor (task 2.3).
 *
 * After a restart, ingesting only the tail from lastCursor lands the
 * same folded state as ingesting the whole stream from scratch.
 */

import { canonicalizeCampaignJson } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';

import {
  CAMPAIGN_ID,
  EPOCH_A,
  GRANT_ID,
  GRANT_ID_B,
  closeCampaignReplicaHarness,
  openCampaignReplicaHarness,
  replicaFundsPage,
  restartCampaignReplicaHarness,
} from './replicaTestHarness';

describe('SQLiteCampaignReplicaStore resume', () => {
  it('tail ingest after restart equals a full-stream ingest on a sibling grant', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      const full = replicaFundsPage(CAMPAIGN_ID, 1, 10);
      const prefix = full.slice(0, 4);
      const scratch = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: full,
      });
      expect(scratch.kind).toBe('applied');
      const expected = await harness.store.readReplicaState(
        CAMPAIGN_ID,
        GRANT_ID,
      );

      const prefixResult = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID_B, {
        deliveryEpochId: EPOCH_A,
        items: prefix,
      });
      expect(prefixResult.kind).toBe('applied');

      await restartCampaignReplicaHarness(harness);

      const cursor = await harness.store.lastCursor(CAMPAIGN_ID, GRANT_ID_B);
      expect(cursor).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 4,
      });
      const tail = full.filter(function (item) {
        return item.deliverySequence > (cursor?.afterSequence ?? 0);
      });
      expect(tail).toHaveLength(6);
      const tailResult = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID_B, {
        deliveryEpochId: cursor?.deliveryEpochId ?? EPOCH_A,
        items: tail,
      });
      expect(tailResult.kind).toBe('applied');
      if (tailResult.kind !== 'applied') return;
      expect(tailResult.appended).toBe(6);

      const resumed = await harness.store.readReplicaState(
        CAMPAIGN_ID,
        GRANT_ID_B,
      );
      expect(canonicalizeCampaignJson(resumed.state)).toBe(
        canonicalizeCampaignJson(expected.state),
      );
      expect(resumed.lastCursor).toEqual(expected.lastCursor);
      expect(resumed.lastDeliverySequence).toBe(10);
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });
});
