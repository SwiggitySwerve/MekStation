/**
 * Replica restart survival (design D6, task 2.3).
 *
 * Ingest a scoped stream, close and reopen the database, and prove the
 * folded state is byte-identical and the resume cursor is exact.
 */

import { canonicalizeCampaignJson } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';

import {
  CAMPAIGN_ID,
  EPOCH_A,
  GRANT_ID,
  closeCampaignReplicaHarness,
  openCampaignReplicaHarness,
  replicaFundsPage,
  restartCampaignReplicaHarness,
} from './replicaTestHarness';

describe('SQLiteCampaignReplicaStore restart survival', () => {
  it('restores folded state byte-for-byte and the exact resume cursor', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      const items = replicaFundsPage(CAMPAIGN_ID, 1, 5);
      const ingested = await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items,
      });
      expect(ingested.kind).toBe('applied');
      if (ingested.kind !== 'applied') return;
      const before = await harness.store.readReplicaState(
        CAMPAIGN_ID,
        GRANT_ID,
      );
      expect(before.lastCursor).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 5,
      });
      const stateBytes = canonicalizeCampaignJson(before.state);
      const cursorBytes = JSON.stringify(before.lastCursor);

      await restartCampaignReplicaHarness(harness);

      const after = await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID);
      expect(canonicalizeCampaignJson(after.state)).toBe(stateBytes);
      expect(JSON.stringify(after.lastCursor)).toBe(cursorBytes);
      expect(after.lastDeliverySequence).toBe(5);
      expect(after.state.balance).toBe(5);
      expect(await harness.store.lastCursor(CAMPAIGN_ID, GRANT_ID)).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 5,
      });
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });
});
