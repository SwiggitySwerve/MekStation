import type {
  IInstanceProvenance,
  IEventJournal,
  ISaveEnvelopeRepository,
} from '../ledger';
import type {
  ILibraryItem,
  ILibraryRepository,
  IPublishLibraryItemInput,
} from '../library';
import type { IGamePlugin } from '../types/GamePlugin';
import type { IEnrollInstanceInput } from './enrollInstance';
import type { IMutateInstanceInput } from './enrollInstance';

import { appendKernelEvent } from '../journal/appendKernelEvent';
import { assertKernelChannel } from '../types/Consistency';
import { enrollInstance, mutateInstance } from './enrollInstance';

export interface IKernelAdapters {
  readonly journal: IEventJournal;
  readonly library: ILibraryRepository;
  readonly snapshots: ISaveEnvelopeRepository;
}

export interface IPublishLibraryCommand extends IPublishLibraryItemInput {
  readonly expectedLibraryStreamRevision: number;
  readonly commandId: string;
  readonly occurredAt: string;
}

export interface IKernelRepositories {
  readonly plugin: IGamePlugin;
  readonly journal: IEventJournal;
  readonly library: ILibraryRepository;
  readonly snapshots: ISaveEnvelopeRepository;
  publishLibraryItem(input: IPublishLibraryCommand): Promise<ILibraryItem>;
  enrollInstance(input: IEnrollInstanceInput): Promise<IInstanceProvenance>;
  mutateInstance(input: IMutateInstanceInput): Promise<ILibraryItem>;
}

export function createRepositories(
  plugin: IGamePlugin,
  adapters: IKernelAdapters,
): IKernelRepositories {
  return {
    plugin,
    journal: adapters.journal,
    library: adapters.library,
    snapshots: adapters.snapshots,
    async publishLibraryItem(input) {
      assertKernelChannel('library-item', 'library-crdt');
      const published = await adapters.library.publish(input);
      if (published.kind !== 'ok') {
        throw new Error(
          published.kind === 'conflict'
            ? `Library version conflict: expected ${published.expectedVersion}, actual ${published.actualVersion}`
            : `Unknown library content type: ${published.contentType}`,
        );
      }
      await appendKernelEvent(adapters.journal, plugin, {
        streamType: plugin.libraryStreamType,
        streamId: published.item.itemId,
        expectedRevision: input.expectedLibraryStreamRevision,
        commandId: input.commandId,
        occurredAt: input.occurredAt,
        eventType: 'LibraryItemPublished',
        payload: {
          itemId: published.item.itemId,
          version: published.item.version,
          contentHash: published.item.contentHash,
        },
        entityRefs: [
          {
            entityType: plugin.libraryEntityType,
            entityId: published.item.itemId,
            role: 'subject',
          },
        ],
      });
      return published.item;
    },
    enrollInstance(input) {
      return enrollInstance({
        plugin,
        journal: adapters.journal,
        library: adapters.library,
        snapshots: adapters.snapshots,
        enroll: input,
      });
    },
    mutateInstance(input) {
      return mutateInstance({
        plugin,
        journal: adapters.journal,
        library: adapters.library,
        snapshots: adapters.snapshots,
        mutate: input,
      });
    },
  };
}
