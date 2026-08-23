/**
 * Replica offline posture (design D6, task 2.3).
 *
 * While disconnected, reads serve the last projected state and mutation
 * intents are refused with replica-offline, which is a different kind
 * from failed. Reconnect then resumes from the persisted cursor.
 */

import {
  REPLICA_INVALID_INTENT_REASON,
  REPLICA_OFFLINE_REFUSAL_REASON,
} from '../campaignReplicaTypes';
import {
  CAMPAIGN_ID,
  EPOCH_A,
  GRANT_ID,
  closeCampaignReplicaHarness,
  openCampaignReplicaHarness,
  replicaFundsPage,
  restartCampaignReplicaHarness,
} from './replicaTestHarness';

const VALID_INTENT = {
  campaignId: CAMPAIGN_ID,
  grantId: GRANT_ID,
  commandId: 'cmd-advance-day',
  type: 'AdvanceDay',
};

describe('SQLiteCampaignReplicaStore offline posture', () => {
  it('serves reads and refuses mutations while disconnected', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: replicaFundsPage(CAMPAIGN_ID, 1, 3),
      });
      expect(harness.store.getConnectionStatus()).toBe('disconnected');

      const offlineRead = await harness.store.readReplicaState(
        CAMPAIGN_ID,
        GRANT_ID,
      );
      expect(offlineRead.state.balance).toBe(3);
      expect(offlineRead.lastCursor).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 3,
      });

      const refused = harness.store.submitMutationIntent(VALID_INTENT);
      expect(refused).toEqual({
        kind: 'refused',
        reason: REPLICA_OFFLINE_REFUSAL_REASON,
      });

      harness.store.setConnectionStatus('connected');
      const failed = harness.store.submitMutationIntent({
        campaignId: CAMPAIGN_ID,
        grantId: GRANT_ID,
        commandId: '',
        type: 'AdvanceDay',
      });
      expect(failed).toEqual({
        kind: 'failed',
        reason: REPLICA_INVALID_INTENT_REASON,
      });
      expect(refused.kind).not.toBe(failed.kind);
      expect(
        refused.kind === 'refused' &&
          refused.reason === REPLICA_OFFLINE_REFUSAL_REASON,
      ).toBe(true);

      const forwarded = harness.store.submitMutationIntent(VALID_INTENT);
      expect(forwarded.kind).toBe('forward');
      if (forwarded.kind !== 'forward') return;
      expect(forwarded.intent).toEqual(VALID_INTENT);
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('reconnects after restart from the persisted cursor, still refusing until marked connected', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: replicaFundsPage(CAMPAIGN_ID, 1, 4),
      });
      harness.store.setConnectionStatus('connected');
      await restartCampaignReplicaHarness(harness);

      expect(harness.store.getConnectionStatus()).toBe('disconnected');
      const cursor = await harness.store.lastCursor(CAMPAIGN_ID, GRANT_ID);
      expect(cursor).toEqual({
        deliveryEpochId: EPOCH_A,
        afterSequence: 4,
      });
      expect(harness.store.submitMutationIntent(VALID_INTENT).kind).toBe(
        'refused',
      );

      harness.store.setConnectionStatus('connected');
      expect(harness.store.submitMutationIntent(VALID_INTENT).kind).toBe(
        'forward',
      );
      expect(await harness.store.lastCursor(CAMPAIGN_ID, GRANT_ID)).toEqual(
        cursor,
      );
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });
});
