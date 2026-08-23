import type { IEventJournal } from '../journal';
import type { IGamePlugin } from '../types/GamePlugin';
import type { IInstanceProvenance } from '../types/InstanceProvenance';
import type { ILibraryItem } from '../types/LibraryItem';
import type { ISaveEnvelope } from '../types/SaveEnvelope';
import type { ILibraryRepository } from './ILibraryRepository';
import type { ISaveEnvelopeRepository } from './ISaveEnvelopeRepository';

import { appendKernelEvent } from '../journal/appendKernelEvent';
import { assertKernelChannel } from '../types/Consistency';

export interface IEnrollInstanceInput {
  readonly envelopeId: string;
  readonly instanceId: string;
  readonly libraryItemId: string;
  readonly expectedSaveRevision: number;
  readonly expectedSaveStreamRevision: number;
  readonly commandId: string;
  readonly occurredAt: string;
  readonly snapshot?: unknown;
}

export interface IMutateInstanceInput {
  readonly envelopeId: string;
  readonly instanceId: string;
  readonly expectedSaveRevision: number;
  readonly expectedSaveStreamRevision: number;
  readonly commandId: string;
  readonly occurredAt: string;
  readonly eventType: string;
  readonly payload: unknown;
}

export async function enrollInstance(input: {
  readonly plugin: IGamePlugin;
  readonly journal: IEventJournal;
  readonly library: ILibraryRepository;
  readonly snapshots: ISaveEnvelopeRepository;
  readonly enroll: IEnrollInstanceInput;
}): Promise<IInstanceProvenance> {
  assertKernelChannel('instance', 'save-ledger');
  const item = await requireLibraryItem(
    input.library,
    input.enroll.libraryItemId,
  );
  const provenance: IInstanceProvenance = {
    instanceId: input.enroll.instanceId,
    libraryItemId: item.itemId,
    sourceVersion: item.version,
    kind: input.plugin.instanceKind,
  };
  await writeEnvelope(input.snapshots, input.plugin, input.enroll, [
    provenance,
  ]);
  await appendKernelEvent(input.journal, input.plugin, {
    streamType: input.plugin.saveStreamType,
    streamId: input.enroll.envelopeId,
    expectedRevision: input.enroll.expectedSaveStreamRevision,
    commandId: input.enroll.commandId,
    occurredAt: input.enroll.occurredAt,
    eventType: 'InstanceEnrolled',
    payload: provenance,
    entityRefs: [
      {
        entityType: input.plugin.instanceEntityType,
        entityId: provenance.instanceId,
        role: 'subject',
      },
    ],
  });
  return provenance;
}

export async function mutateInstance(input: {
  readonly plugin: IGamePlugin;
  readonly journal: IEventJournal;
  readonly library: ILibraryRepository;
  readonly snapshots: ISaveEnvelopeRepository;
  readonly mutate: IMutateInstanceInput;
}): Promise<ILibraryItem> {
  assertKernelChannel('instance', 'save-ledger');
  const envelope = await input.snapshots.get(input.mutate.envelopeId);
  if (!envelope) {
    throw new Error(`Save envelope ${input.mutate.envelopeId} is missing`);
  }
  const instance = envelope.instances.find(
    (entry) => entry.instanceId === input.mutate.instanceId,
  );
  if (!instance) {
    throw new Error(`Instance ${input.mutate.instanceId} is missing`);
  }
  const pinned = await input.library.getVersion(
    instance.libraryItemId,
    instance.sourceVersion,
  );
  if (!pinned) {
    throw new Error(
      `Pinned library version ${instance.sourceVersion} is missing`,
    );
  }
  await appendKernelEvent(input.journal, input.plugin, {
    streamType: input.plugin.saveStreamType,
    streamId: input.mutate.envelopeId,
    expectedRevision: input.mutate.expectedSaveStreamRevision,
    commandId: input.mutate.commandId,
    occurredAt: input.mutate.occurredAt,
    eventType: input.mutate.eventType,
    payload: input.mutate.payload,
    entityRefs: [
      {
        entityType: input.plugin.instanceEntityType,
        entityId: instance.instanceId,
        role: 'subject',
      },
    ],
  });
  const next: ISaveEnvelope = {
    ...envelope,
    revision: envelope.revision + 1,
    snapshot: input.mutate.payload,
  };
  const saved = await input.snapshots.save(
    next,
    input.mutate.expectedSaveRevision,
  );
  if (saved.kind !== 'ok') {
    throw new Error(
      `Save envelope revision conflict: expected ${saved.expectedRevision}, actual ${saved.actualRevision}`,
    );
  }
  return pinned;
}

async function requireLibraryItem(
  library: ILibraryRepository,
  itemId: string,
): Promise<ILibraryItem> {
  const item = await library.get(itemId);
  if (!item) {
    throw new Error(`Library item ${itemId} is missing`);
  }
  return item;
}

async function writeEnvelope(
  snapshots: ISaveEnvelopeRepository,
  plugin: IGamePlugin,
  enroll: IEnrollInstanceInput,
  added: readonly IInstanceProvenance[],
): Promise<void> {
  const current = await snapshots.get(enroll.envelopeId);
  const envelope: ISaveEnvelope = current
    ? {
        ...current,
        revision: current.revision + 1,
        snapshot: enroll.snapshot ?? current.snapshot,
        instances: [...current.instances, ...added],
      }
    : {
        envelopeId: enroll.envelopeId,
        gameId: plugin.gameId,
        schemaId: plugin.schemaId,
        schemaVersion: plugin.schemaVersion,
        revision: 1,
        snapshot: enroll.snapshot ?? null,
        journalHighWater: 0,
        instances: [...added],
      };
  const saved = await snapshots.save(envelope, enroll.expectedSaveRevision);
  if (saved.kind !== 'ok') {
    throw new Error(
      `Save envelope revision conflict: expected ${saved.expectedRevision}, actual ${saved.actualRevision}`,
    );
  }
}
