/**
 * Borrowed-handle replica durable store (design D6, task 2.3).
 *
 * STRUCTURAL LAW: this adapter reads delivered grant items and writes
 * only `streamType: 'campaign-replica'` / `streamId: campaignId#grantId`.
 * It never opens a source campaign writer and never mutates a grant
 * store. A downstream ingest failure cannot affect the source because
 * this handle only appends replica streams on the consuming device.
 *
 * deliveryEpochId is persisted on every replica envelope (see
 * ICampaignReplicaEnvelope) so lastCursor survives restart without a
 * new SQLite migration: the journal tables already exist.
 *
 * Connection status is process-local. Restart defaults to disconnected
 * (reads still work; mutation intents are refused typed, never queued).
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6, D7)
 */

import type Database from 'better-sqlite3';

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type {
  IAppendEventBatch,
  IEventJournal,
  IResolvedJournalPrincipal,
  IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';

import { foldCampaignGrantDeliveryItems } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import {
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
} from '@/lib/events/journal/EventJournalContract';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { CampaignReplicaClock } from './campaignReplicaTypes';
import type { CampaignReplicaConnectionStatus } from './campaignReplicaTypes';
import type { CampaignReplicaIngestResult } from './campaignReplicaTypes';
import type { CampaignReplicaMutationResult } from './campaignReplicaTypes';
import type { CampaignReplicaChainVerifyResult } from './campaignReplicaTypes';
import type { ICampaignReplicaEnvelope } from './campaignReplicaTypes';
import type { ICampaignReplicaMutationIntent } from './campaignReplicaTypes';
import type { ICampaignReplicaReadResult } from './campaignReplicaTypes';
import type { IDeliveryCursor } from './campaignReplicaTypes';

import {
  parseCampaignReplicaEnvelope,
  replicaEnvelopeToDeliveryItem,
} from './campaignReplicaEnvelope';
import { evaluateReplicaMutationIntent } from './campaignReplicaOffline';
import { CAMPAIGN_REPLICA_STREAM_TYPE } from './campaignReplicaTypes';
import { campaignReplicaStreamId } from './campaignReplicaTypes';
import { planCampaignReplicaIngest } from './planCampaignReplicaIngest';
import { verifyCampaignReplicaStoredChain } from './verifyCampaignReplicaChain';

/**
 * Principal recorded on replica ingest commands. authorityType is the
 * replica role so these rows cannot be mistaken for source appends.
 */
function replicaPrincipal(streamId: string): IResolvedJournalPrincipal {
  return {
    actorKind: 'system',
    actorId: 'campaign-replica-ingest',
    authorityType: 'campaign-replica',
    authorityId: streamId,
  };
}

/**
 * Deterministic command and event id for one deliverySequence so a
 * retried ingest of the same sequence does not mint a second identity.
 */
function replicaCommandId(streamId: string, deliverySequence: number): string {
  return `campaign-replica:${streamId}:${deliverySequence}`;
}

export class SQLiteCampaignReplicaStore {
  private readonly journal: IEventJournal<ICampaignReplicaEnvelope>;
  private connectionStatus: CampaignReplicaConnectionStatus = 'disconnected';

  /**
   * Binds a borrowed SQLite handle. The adapter does not own the
   * connection lifetime. Clock is required so recordedAt is injected.
   */
  public constructor(db: Database.Database, clock: CampaignReplicaClock) {
    this.journal = new SQLiteEventJournal<ICampaignReplicaEnvelope>(db, clock);
  }

  /**
   * Updates process-local connection posture. Not persisted: a restart
   * is disconnected until the channel (task 3.3/3.5) marks connected.
   */
  public setConnectionStatus(status: CampaignReplicaConnectionStatus): void {
    this.connectionStatus = status;
  }

  /**
   * Current process-local posture. Restarting the store yields
   * disconnected even when a cursor is already stored.
   */
  public getConnectionStatus(): CampaignReplicaConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Appends received delivery items to the per-grant replica stream.
   * Idempotent by deliverySequence; gap/collision/foreign-epoch fail
   * closed with the task-3.3 reasons and write nothing from this page.
   */
  public async ingest(
    campaignId: string,
    grantId: string,
    delivery: {
      readonly deliveryEpochId: string;
      readonly items: readonly ICampaignGrantDeliveryItem[];
    },
  ): Promise<CampaignReplicaIngestResult> {
    const streamId = campaignReplicaStreamId(campaignId, grantId);
    const stored = await this.readEnvelopes(streamId);
    const plan = planCampaignReplicaIngest(
      stored,
      delivery.deliveryEpochId,
      delivery.items,
    );
    if (plan.kind !== 'append') {
      return plan;
    }
    for (const item of plan.pending) {
      await this.appendReplicaItem(
        campaignId,
        streamId,
        delivery.deliveryEpochId,
        item,
      );
    }
    return {
      kind: 'applied',
      appended: plan.pending.length,
      lastCursor: plan.lastCursor,
    };
  }

  /**
   * Folds the stored replica stream through applyCampaignEvent (via the
   * shared delivery fold) and returns the resume cursor. Empty streams
   * yield empty authoritative state and a null cursor (join from zero).
   */
  public async readReplicaState(
    campaignId: string,
    grantId: string,
  ): Promise<ICampaignReplicaReadResult> {
    const streamId = campaignReplicaStreamId(campaignId, grantId);
    const stored = await this.readEnvelopes(streamId);
    const items = stored.map(replicaEnvelopeToDeliveryItem);
    const last = stored[stored.length - 1];
    if (last === undefined) {
      return {
        state: createEmptyCampaignState(campaignId),
        lastDeliverySequence: 0,
        lastCursor: null,
      };
    }
    return {
      state: foldCampaignGrantDeliveryItems(campaignId, items),
      lastDeliverySequence: last.deliverySequence,
      lastCursor: {
        deliveryEpochId: last.deliveryEpochId,
        afterSequence: last.deliverySequence,
      },
    };
  }

  /**
   * Resume cursor persisted in the replica envelopes. Null means this
   * grant has never ingested, so a join should send a null cursor.
   */
  public async lastCursor(
    campaignId: string,
    grantId: string,
  ): Promise<IDeliveryCursor | null> {
    const read = await this.readReplicaState(campaignId, grantId);
    return read.lastCursor;
  }

  /**
   * Mutation-intent gate. Disconnected refuses typed and does not
   * queue. Connected returns `forward` or `failed`; this adapter never
   * writes a source campaign stream either way.
   */
  public submitMutationIntent(
    intent: ICampaignReplicaMutationIntent,
  ): CampaignReplicaMutationResult {
    return evaluateReplicaMutationIntent(this.connectionStatus, intent);
  }

  /**
   * Proves the replica stream's journal digest chain. Payload tampers
   * that fail hydrateEvent surface as thrown integrity errors; a
   * rewritten predecessor surfaces as `chain-break`.
   */
  public async verifyChain(
    campaignId: string,
    grantId: string,
  ): Promise<CampaignReplicaChainVerifyResult> {
    const streamId = campaignReplicaStreamId(campaignId, grantId);
    const events = await this.readStoredEvents(streamId);
    return verifyCampaignReplicaStoredChain(events);
  }

  /**
   * Count of durable replica rows for this grant. Used by ingest tests
   * to prove a duplicate page does not write.
   */
  public async storedEventCount(
    campaignId: string,
    grantId: string,
  ): Promise<number> {
    const streamId = campaignReplicaStreamId(campaignId, grantId);
    const events = await this.readStoredEvents(streamId);
    return events.length;
  }

  /**
   * Pages the replica journal stream. streamType is pinned to
   * campaign-replica so a caller cannot ask this adapter to read a
   * source campaign stream either.
   */
  private async readStoredEvents(
    streamId: string,
  ): Promise<readonly IStoredEvent<ICampaignReplicaEnvelope>[]> {
    const events: IStoredEvent<ICampaignReplicaEnvelope>[] = [];
    let afterRevision = 0;
    for (;;) {
      const page = await this.journal.readStream({
        streamType: CAMPAIGN_REPLICA_STREAM_TYPE,
        streamId,
        branchId: ROOT_EVENT_BRANCH_ID,
        afterRevision,
        limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
      });
      for (const stored of page) {
        parseCampaignReplicaEnvelope(stored.payload);
        events.push(stored);
      }
      if (page.length < EVENT_JOURNAL_MAX_PAGE_SIZE) return events;
      afterRevision = page[page.length - 1].streamRevision;
    }
  }

  /**
   * Hydrates replica envelopes in delivery order.
   */
  private async readEnvelopes(
    streamId: string,
  ): Promise<readonly ICampaignReplicaEnvelope[]> {
    const events = await this.readStoredEvents(streamId);
    return events.map(function (stored) {
      return parseCampaignReplicaEnvelope(stored.payload);
    });
  }

  /**
   * Appends one delivery item to the replica stream and only the
   * replica stream. expectedRevision is deliverySequence - 1 so
   * sequence N lives at journal revision N.
   */
  private async appendReplicaItem(
    campaignId: string,
    streamId: string,
    deliveryEpochId: string,
    item: ICampaignGrantDeliveryItem,
  ): Promise<void> {
    const commandId = replicaCommandId(streamId, item.deliverySequence);
    const envelope: ICampaignReplicaEnvelope = {
      deliveryEpochId,
      deliverySequence: item.deliverySequence,
      event: item.event,
    };
    const batch: IAppendEventBatch<ICampaignReplicaEnvelope> = {
      streamType: CAMPAIGN_REPLICA_STREAM_TYPE,
      streamId,
      expectedBranchId: ROOT_EVENT_BRANCH_ID,
      expectedRevision: item.deliverySequence - 1,
      commandId,
      principal: replicaPrincipal(streamId),
      events: [
        {
          eventId: commandId,
          eventType: item.event.type,
          eventVersion: 1,
          correlationId: commandId,
          causationEventIds: [],
          occurredAt: item.event.ts,
          payload: envelope,
          entityRefs: [
            {
              entityType: 'campaign',
              entityId: campaignId,
              role: 'replica-subject',
            },
          ],
        },
      ],
    };
    const result = await this.journal.append(batch);
    if (result.kind !== 'committed') {
      throw new Error(`Replica ingest append did not commit (${result.kind})`);
    }
  }
}
