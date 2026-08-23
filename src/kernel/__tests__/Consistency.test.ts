import type { KernelChannel, KernelMutationKind } from '../types/Consistency';

import {
  InMemoryEventJournal,
  InMemorySaveEnvelopeRepository,
} from '../ledger';
import { InMemoryLibraryRepository } from '../library';
import { TOY_CARD_PLUGIN } from '../plugins/toyCardPlugin';
import { createRepositories } from '../repositories/createRepositories';
import {
  assertKernelChannel,
  KERNEL_CHANNELS,
  KERNEL_MUTATION_KINDS,
  KernelConsistencyError,
} from '../types/Consistency';

const NOW = '2026-08-23T00:00:00.000Z';

/**
 * The full channel matrix. `library-item` is the only CRDT-capable
 * mutation kind: catalog blobs may converge, ledger writes may not.
 */
const ALLOWED_MATRIX: ReadonlyArray<
  readonly [KernelMutationKind, KernelChannel, boolean]
> = [
  ['library-item', 'library-crdt', true],
  ['library-item', 'save-ledger', true],
  ['instance', 'library-crdt', false],
  ['instance', 'save-ledger', true],
  ['save-envelope', 'library-crdt', false],
  ['save-envelope', 'save-ledger', true],
];

describe('kernel consistency channel', () => {
  it('allows library items on the CRDT channel', () => {
    expect(() => {
      assertKernelChannel('library-item', 'library-crdt');
    }).not.toThrow();
  });

  it('rejects save-envelope and instance mutations on the CRDT channel', () => {
    expect(() => {
      assertKernelChannel('save-envelope', 'library-crdt');
    }).toThrow(KernelConsistencyError);
    expect(() => {
      assertKernelChannel('instance', 'library-crdt');
    }).toThrow(KernelConsistencyError);
    expect(() => {
      assertKernelChannel('save-envelope', 'save-ledger');
    }).not.toThrow();
  });

  it('covers every mutation kind and channel pair', () => {
    const covered = ALLOWED_MATRIX.map(
      ([kind, channel]) => `${kind}/${channel}`,
    );
    const expected = KERNEL_MUTATION_KINDS.flatMap((kind) =>
      KERNEL_CHANNELS.map((channel) => `${kind}/${channel}`),
    );
    expect(covered.sort()).toEqual([...expected].sort());
  });

  it.each(ALLOWED_MATRIX)(
    '%s on %s is allowed: %s',
    (mutationKind, channel, allowed) => {
      const assert = () => {
        assertKernelChannel(mutationKind, channel);
      };
      if (allowed) {
        expect(assert).not.toThrow();
        return;
      }
      expect(assert).toThrow(KernelConsistencyError);
    },
  );

  it('reports the offending kind and channel on the error', () => {
    try {
      assertKernelChannel('instance', 'library-crdt');
      throw new Error('Expected a KernelConsistencyError');
    } catch (error) {
      if (!(error instanceof KernelConsistencyError)) {
        throw error;
      }
      expect(error.mutationKind).toBe('instance');
      expect(error.channel).toBe('library-crdt');
      expect(error.name).toBe('KernelConsistencyError');
    }
  });

  it('asserts the CRDT channel from publishLibraryItem', async () => {
    const plugin = TOY_CARD_PLUGIN;
    const repos = createRepositories(plugin, {
      journal: new InMemoryEventJournal(() => NOW),
      library: new InMemoryLibraryRepository(plugin),
      snapshots: new InMemorySaveEnvelopeRepository(),
    });

    await expect(
      repos.publishLibraryItem({
        itemId: 'card-ace',
        contentType: 'card',
        content: '{"name":"ace of spades"}',
        expectedVersion: 0,
        expectedLibraryStreamRevision: 0,
        commandId: 'publish-1',
        occurredAt: NOW,
      }),
    ).resolves.toMatchObject({ itemId: 'card-ace', version: 1 });
  });
});
