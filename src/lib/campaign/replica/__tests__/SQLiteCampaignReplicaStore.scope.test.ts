/**
 * Replica scope integrity (task 2.3).
 *
 * Ingesting a page from a restricted grant never yields replica state
 * containing out-of-scope material. Composed with the delivery harness
 * so this is an end-to-end property of project-then-ingest, not a
 * re-assertion of the filter.
 */

import {
  canonicalizeCampaignJson,
  foldCampaignGrantDeliveryItems,
} from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import { projectCampaignStreamForGrant } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import {
  SNAPSHOT_WITHHELD_GM,
  SNAPSHOT_WITHHELD_PILOT,
  buildInterleavedLedger,
} from '../../delivery/__tests__/campaignGrantSnapshot.test-helpers';
import {
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from '../../delivery/__tests__/grantProjectionHarness';
import { SQLiteCampaignReplicaStore } from '../SQLiteCampaignReplicaStore';
import { countJournalStream } from './replicaTestHarness';

const REPLICA_NOW = '2026-08-22T18:00:00.000Z';

describe('SQLiteCampaignReplicaStore scope integrity', () => {
  it('stores exactly the delivered restricted page and no withheld material', async () => {
    const harness = await openCampaignDeliveryHarness();
    try {
      const campaignId = 'campaign-replica-scope';
      const grant = issueTestGrant(harness, {
        campaignId,
        participantId: PARTICIPANT_PLAYER,
        scopes: ['campaign'],
      });
      const ledger = buildInterleavedLedger(campaignId, 3);
      for (const event of ledger) {
        await appendCampaignEvent(harness, event);
      }
      const sourceRows = countJournalStream('campaign', campaignId);
      expect(sourceRows).toBeGreaterThan(0);

      const page = await projectCampaignStreamForGrant(harness.deps, {
        principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
        grantId: grant.grantId,
        cursor: null,
      });
      expect(page.kind).toBe('page');
      if (page.kind !== 'page') return;
      expect(page.items.length).toBeGreaterThan(0);

      const replica = new SQLiteCampaignReplicaStore(
        getSQLiteService().getDatabase(),
        function () {
          return REPLICA_NOW;
        },
      );
      const ingested = await replica.ingest(campaignId, grant.grantId, {
        deliveryEpochId: page.deliveryEpochId,
        items: page.items,
      });
      expect(ingested.kind).toBe('applied');
      expect(countJournalStream('campaign', campaignId)).toBe(sourceRows);
      expect(await replica.storedEventCount(campaignId, grant.grantId)).toBe(
        page.items.length,
      );

      const read = await replica.readReplicaState(campaignId, grant.grantId);
      const expected = foldCampaignGrantDeliveryItems(campaignId, page.items);
      expect(canonicalizeCampaignJson(read.state)).toBe(
        canonicalizeCampaignJson(expected),
      );
      const serialized = canonicalizeCampaignJson(read.state);
      expect(serialized).not.toContain(SNAPSHOT_WITHHELD_GM);
      expect(serialized).not.toContain(SNAPSHOT_WITHHELD_PILOT);
      expect(read.state.pilots[SNAPSHOT_WITHHELD_PILOT]).toBeUndefined();
      expect(read.state.rosterUnits['unit-gm-secret']).toBeUndefined();
      expect(read.state.pilots['pilot-alice']).toBeDefined();

      const sourcePayload = getSQLiteService()
        .getDatabase()
        .prepare(
          `SELECT payload_json AS payloadJson FROM event_journal_events
           WHERE stream_type = 'campaign' AND stream_id = ?`,
        )
        .all(campaignId) as Array<{ readonly payloadJson: string }>;
      expect(
        sourcePayload.some(function (row) {
          return row.payloadJson.includes(SNAPSHOT_WITHHELD_GM);
        }),
      ).toBe(true);
    } finally {
      await closeCampaignDeliveryHarness(harness);
    }
  });
});
