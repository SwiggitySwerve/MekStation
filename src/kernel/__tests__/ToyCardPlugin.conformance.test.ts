import {
  InMemoryEventJournal,
  InMemorySaveEnvelopeRepository,
} from '../ledger';
import {
  hashLibraryContent,
  InMemoryLibraryReplica,
  InMemoryLibraryRepository,
} from '../library';
import { TOY_CARD_PLUGIN } from '../plugins/toyCardPlugin';
import { createRepositories } from '../repositories/createRepositories';

const NOW = '2026-08-23T00:00:00.000Z';

function createToyKernel() {
  const plugin = TOY_CARD_PLUGIN;
  const journal = new InMemoryEventJournal(() => NOW);
  const repos = createRepositories(plugin, {
    journal,
    library: new InMemoryLibraryRepository(plugin),
    snapshots: new InMemorySaveEnvelopeRepository(),
  });
  return { plugin, journal, repos };
}

describe('toy card plugin kernel conformance', () => {
  it('enrolls an instance without mutating the library template', async () => {
    const { plugin, journal, repos } = createToyKernel();
    const published = await repos.publishLibraryItem({
      itemId: 'card-ace',
      contentType: 'card',
      content: '{"name":"ace of spades"}',
      expectedVersion: 0,
      expectedLibraryStreamRevision: 0,
      commandId: 'publish-1',
      occurredAt: NOW,
    });
    const enrolled = await repos.enrollInstance({
      envelopeId: 'table-run-1',
      instanceId: 'in-play-1',
      libraryItemId: 'card-ace',
      expectedSaveRevision: 0,
      expectedSaveStreamRevision: 0,
      commandId: 'enroll-1',
      occurredAt: NOW,
    });
    expect(enrolled.sourceVersion).toBe(1);
    expect(enrolled.libraryItemId).toBe('card-ace');
    const beforeMutate = await repos.library.get('card-ace');
    await repos.mutateInstance({
      envelopeId: 'table-run-1',
      instanceId: 'in-play-1',
      expectedSaveRevision: 1,
      expectedSaveStreamRevision: 1,
      commandId: 'tap-1',
      occurredAt: NOW,
      eventType: 'CardTapped',
      payload: { tapped: true },
    });
    const afterMutate = await repos.library.get('card-ace');
    expect(afterMutate).toEqual(beforeMutate);
    expect(afterMutate?.content).toBe('{"name":"ace of spades"}');
    expect(afterMutate?.version).toBe(published.version);

    const next = await repos.publishLibraryItem({
      itemId: 'card-ace',
      contentType: 'card',
      content: '{"name":"ace of spades foil"}',
      expectedVersion: 1,
      expectedLibraryStreamRevision: 1,
      commandId: 'publish-2',
      occurredAt: NOW,
    });
    expect(next.version).toBe(2);
    const envelope = await repos.snapshots.get('table-run-1');
    expect(envelope?.instances[0]?.sourceVersion).toBe(1);
    const pinned = await repos.library.getVersion('card-ace', 1);
    expect(pinned?.content).toBe('{"name":"ace of spades"}');

    const instanceHistory = await journal.readEntityHistory({
      entityType: plugin.instanceEntityType,
      entityId: 'in-play-1',
      afterCommitPosition: 0,
      throughCommitPosition: 99,
      limit: 20,
    });
    const libraryHistory = await journal.readEntityHistory({
      entityType: plugin.libraryEntityType,
      entityId: 'card-ace',
      afterCommitPosition: 0,
      throughCommitPosition: 99,
      limit: 20,
    });
    const instanceIds = instanceHistory.map((event) => event.eventId);
    const libraryIds = libraryHistory.map((event) => event.eventId);
    expect(instanceIds).toEqual(['enroll-1:event:0', 'tap-1:event:0']);
    expect(libraryIds).toEqual(['publish-1:event:0', 'publish-2:event:0']);
    expect(instanceIds.filter((id) => libraryIds.includes(id))).toEqual([]);
  });

  it('isolates two instances of one template from each other', async () => {
    const { plugin, journal, repos } = createToyKernel();
    await repos.publishLibraryItem({
      itemId: 'card-ace',
      contentType: 'card',
      content: '{"name":"ace of spades"}',
      expectedVersion: 0,
      expectedLibraryStreamRevision: 0,
      commandId: 'publish-1',
      occurredAt: NOW,
    });
    await repos.enrollInstance({
      envelopeId: 'table-run-1',
      instanceId: 'in-play-1',
      libraryItemId: 'card-ace',
      expectedSaveRevision: 0,
      expectedSaveStreamRevision: 0,
      commandId: 'enroll-1',
      occurredAt: NOW,
    });
    await repos.enrollInstance({
      envelopeId: 'table-run-1',
      instanceId: 'in-play-2',
      libraryItemId: 'card-ace',
      expectedSaveRevision: 1,
      expectedSaveStreamRevision: 1,
      commandId: 'enroll-2',
      occurredAt: NOW,
    });

    const beforeMutate = await repos.library.get('card-ace');
    await repos.mutateInstance({
      envelopeId: 'table-run-1',
      instanceId: 'in-play-1',
      expectedSaveRevision: 2,
      expectedSaveStreamRevision: 2,
      commandId: 'tap-1',
      occurredAt: NOW,
      eventType: 'CardTapped',
      payload: { tapped: true },
    });

    expect(await repos.library.get('card-ace')).toEqual(beforeMutate);
    const envelope = await repos.snapshots.get('table-run-1');
    expect(
      envelope?.instances.map((entry) => [
        entry.instanceId,
        entry.sourceVersion,
      ]),
    ).toEqual([
      ['in-play-1', 1],
      ['in-play-2', 1],
    ]);

    const untouched = await journal.readEntityHistory({
      entityType: plugin.instanceEntityType,
      entityId: 'in-play-2',
      afterCommitPosition: 0,
      throughCommitPosition: 99,
      limit: 20,
    });
    expect(untouched.map((event) => event.eventType)).toEqual([
      'InstanceEnrolled',
    ]);
  });

  it('keeps the enrolled pin stable when a replica forks the template', async () => {
    const { repos } = createToyKernel();
    await repos.publishLibraryItem({
      itemId: 'card-ace',
      contentType: 'card',
      content: '{"name":"ace of spades"}',
      expectedVersion: 0,
      expectedLibraryStreamRevision: 0,
      commandId: 'publish-1',
      occurredAt: NOW,
    });
    await repos.enrollInstance({
      envelopeId: 'table-run-1',
      instanceId: 'in-play-1',
      libraryItemId: 'card-ace',
      expectedSaveRevision: 0,
      expectedSaveStreamRevision: 0,
      commandId: 'enroll-1',
      occurredAt: NOW,
    });
    const published = await repos.library.get('card-ace');
    if (!published) throw new Error('Expected a published template');

    const alpha = new InMemoryLibraryReplica();
    const beta = new InMemoryLibraryReplica();
    alpha.put(published);
    const remoteContent = '{"name":"ace of spades remix"}';
    beta.put({
      ...published,
      content: remoteContent,
      contentHash: hashLibraryContent(remoteContent),
    });
    alpha.connect(beta);
    const conflict = alpha
      .syncFromPeer()
      .find((exchange) => exchange.kind === 'conflict');
    if (!conflict || conflict.kind !== 'conflict') {
      throw new Error('Expected a replica conflict');
    }
    const forked = alpha.resolve(conflict.conflict, 'fork');
    expect(forked.itemId).toBe('card-ace:fork');

    const envelope = await repos.snapshots.get('table-run-1');
    expect(envelope?.instances[0]?.sourceVersion).toBe(1);
    expect(envelope?.instances[0]?.libraryItemId).toBe('card-ace');
    expect(await repos.library.get('card-ace')).toEqual(published);
    expect(await repos.library.get('card-ace:fork')).toBeNull();
  });
});
