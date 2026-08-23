import type {
  IAppendEventBatch,
  IEntityEventRef,
  IEventJournal,
  IEventToAppend,
  IResolvedJournalPrincipal,
} from '../journal';
import type { IGamePlugin } from '../types/GamePlugin';

import { ROOT_EVENT_BRANCH_ID } from '../journal';

export const KERNEL_JOURNAL_PRINCIPAL: IResolvedJournalPrincipal = {
  actorKind: 'system',
  actorId: 'kernel',
  authorityType: 'kernel',
  authorityId: 'repository-factory',
};

export interface IKernelJournalEventInput {
  readonly streamType: string;
  readonly streamId: string;
  readonly expectedRevision: number;
  readonly commandId: string;
  readonly occurredAt: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly entityRefs: readonly IEntityEventRef[];
}

export async function appendKernelEvent(
  journal: IEventJournal,
  plugin: IGamePlugin,
  input: IKernelJournalEventInput,
): Promise<number> {
  const event: IEventToAppend = {
    eventId: `${input.commandId}:event:0`,
    eventType: input.eventType,
    eventVersion: plugin.schemaVersion,
    correlationId: input.commandId,
    causationEventIds: [],
    occurredAt: input.occurredAt,
    payload: input.payload,
    entityRefs: input.entityRefs,
  };
  const batch: IAppendEventBatch = {
    streamType: input.streamType,
    streamId: input.streamId,
    expectedBranchId: ROOT_EVENT_BRANCH_ID,
    expectedRevision: input.expectedRevision,
    commandId: input.commandId,
    principal: {
      ...KERNEL_JOURNAL_PRINCIPAL,
      authorityId: plugin.gameId,
    },
    events: [event],
  };
  const result = await journal.append(batch);
  if (result.kind !== 'committed') {
    throw new Error(`Kernel journal append failed: ${result.kind}`);
  }
  return result.receipt.lastStreamRevision;
}
