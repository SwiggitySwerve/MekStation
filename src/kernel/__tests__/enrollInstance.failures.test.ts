import type { IKernelRepositories } from '../repositories/createRepositories';

import {
  InMemoryEventJournal,
  InMemorySaveEnvelopeRepository,
} from '../ledger';
import { InMemoryLibraryRepository } from '../library';
import { TOY_CARD_PLUGIN } from '../plugins/toyCardPlugin';
import { createRepositories } from '../repositories/createRepositories';

const NOW = '2026-08-23T00:00:00.000Z';
const ENVELOPE_ID = 'table-run-1';
const ITEM_ID = 'card-ace';
const INSTANCE_ID = 'in-play-1';

interface IToyKernel {
  readonly plugin: typeof TOY_CARD_PLUGIN;
  readonly journal: InMemoryEventJournal;
  readonly snapshots: InMemorySaveEnvelopeRepository;
  readonly repos: IKernelRepositories;
}

function createToyKernel(): IToyKernel {
  const plugin = TOY_CARD_PLUGIN;
  const journal = new InMemoryEventJournal(() => NOW);
  const snapshots = new InMemorySaveEnvelopeRepository();
  const repos = createRepositories(plugin, {
    journal,
    library: new InMemoryLibraryRepository(plugin),
    snapshots,
  });
  return { plugin, journal, snapshots, repos };
}

async function publishAce(repos: IKernelRepositories): Promise<void> {
  await repos.publishLibraryItem({
    itemId: ITEM_ID,
    contentType: 'card',
    content: '{"name":"ace of spades"}',
    expectedVersion: 0,
    expectedLibraryStreamRevision: 0,
    commandId: 'publish-1',
    occurredAt: NOW,
  });
}

async function enrollAce(repos: IKernelRepositories): Promise<void> {
  await repos.enrollInstance({
    envelopeId: ENVELOPE_ID,
    instanceId: INSTANCE_ID,
    libraryItemId: ITEM_ID,
    expectedSaveRevision: 0,
    expectedSaveStreamRevision: 0,
    commandId: 'enroll-1',
    occurredAt: NOW,
  });
}

describe('enrollInstance and mutateInstance failure paths', () => {
  it('refuses to enroll an unpublished library item and writes no envelope', async () => {
    const { repos, snapshots } = createToyKernel();

    await expect(
      repos.enrollInstance({
        envelopeId: ENVELOPE_ID,
        instanceId: INSTANCE_ID,
        libraryItemId: 'card-missing',
        expectedSaveRevision: 0,
        expectedSaveStreamRevision: 0,
        commandId: 'enroll-1',
        occurredAt: NOW,
      }),
    ).rejects.toThrow('Library item card-missing is missing');

    expect(await snapshots.get(ENVELOPE_ID)).toBeNull();
  });

  it('refuses to enroll onto an envelope whose revision does not match', async () => {
    const { repos, snapshots } = createToyKernel();
    await publishAce(repos);

    await expect(
      repos.enrollInstance({
        envelopeId: ENVELOPE_ID,
        instanceId: INSTANCE_ID,
        libraryItemId: ITEM_ID,
        expectedSaveRevision: 4,
        expectedSaveStreamRevision: 0,
        commandId: 'enroll-1',
        occurredAt: NOW,
      }),
    ).rejects.toThrow('Save envelope revision conflict: expected 4, actual 0');

    expect(await snapshots.get(ENVELOPE_ID)).toBeNull();
  });

  it('refuses to mutate an envelope that does not exist', async () => {
    const { repos } = createToyKernel();
    await publishAce(repos);

    await expect(
      repos.mutateInstance({
        envelopeId: ENVELOPE_ID,
        instanceId: INSTANCE_ID,
        expectedSaveRevision: 0,
        expectedSaveStreamRevision: 0,
        commandId: 'tap-1',
        occurredAt: NOW,
        eventType: 'CardTapped',
        payload: { tapped: true },
      }),
    ).rejects.toThrow(`Save envelope ${ENVELOPE_ID} is missing`);
  });

  it('refuses to mutate an instance that is not enrolled in the envelope', async () => {
    const { repos } = createToyKernel();
    await publishAce(repos);
    await enrollAce(repos);

    await expect(
      repos.mutateInstance({
        envelopeId: ENVELOPE_ID,
        instanceId: 'in-play-999',
        expectedSaveRevision: 1,
        expectedSaveStreamRevision: 1,
        commandId: 'tap-1',
        occurredAt: NOW,
        eventType: 'CardTapped',
        payload: { tapped: true },
      }),
    ).rejects.toThrow('Instance in-play-999 is missing');
  });

  it('refuses to mutate when the pinned library version is gone', async () => {
    const { plugin, repos, snapshots } = createToyKernel();
    await publishAce(repos);
    await snapshots.save(
      {
        envelopeId: ENVELOPE_ID,
        gameId: plugin.gameId,
        schemaId: plugin.schemaId,
        schemaVersion: plugin.schemaVersion,
        revision: 1,
        snapshot: null,
        journalHighWater: 0,
        instances: [
          {
            instanceId: INSTANCE_ID,
            libraryItemId: ITEM_ID,
            sourceVersion: 99,
            kind: plugin.instanceKind,
          },
        ],
      },
      0,
    );

    await expect(
      repos.mutateInstance({
        envelopeId: ENVELOPE_ID,
        instanceId: INSTANCE_ID,
        expectedSaveRevision: 1,
        expectedSaveStreamRevision: 1,
        commandId: 'tap-1',
        occurredAt: NOW,
        eventType: 'CardTapped',
        payload: { tapped: true },
      }),
    ).rejects.toThrow('Pinned library version 99 is missing');
  });

  it('refuses to mutate when the envelope revision moved underneath the command', async () => {
    const { repos, snapshots } = createToyKernel();
    await publishAce(repos);
    await enrollAce(repos);

    await expect(
      repos.mutateInstance({
        envelopeId: ENVELOPE_ID,
        instanceId: INSTANCE_ID,
        expectedSaveRevision: 7,
        expectedSaveStreamRevision: 1,
        commandId: 'tap-1',
        occurredAt: NOW,
        eventType: 'CardTapped',
        payload: { tapped: true },
      }),
    ).rejects.toThrow('Save envelope revision conflict: expected 7, actual 1');

    expect((await snapshots.get(ENVELOPE_ID))?.revision).toBe(1);
  });
});

describe('enroll and mutate journal placement', () => {
  it('appends enroll and mutate to the save stream with instance refs only', async () => {
    const { plugin, journal, repos } = createToyKernel();
    await publishAce(repos);
    await enrollAce(repos);
    await repos.mutateInstance({
      envelopeId: ENVELOPE_ID,
      instanceId: INSTANCE_ID,
      expectedSaveRevision: 1,
      expectedSaveStreamRevision: 1,
      commandId: 'tap-1',
      occurredAt: NOW,
      eventType: 'CardTapped',
      payload: { tapped: true },
    });

    const instanceHistory = await journal.readEntityHistory({
      entityType: plugin.instanceEntityType,
      entityId: INSTANCE_ID,
      afterCommitPosition: 0,
      throughCommitPosition: 99,
      limit: 20,
    });

    expect(instanceHistory.map((event) => event.eventType)).toEqual([
      'InstanceEnrolled',
      'CardTapped',
    ]);
    for (const event of instanceHistory) {
      expect(event.streamType).toBe(plugin.saveStreamType);
      expect(event.streamId).toBe(ENVELOPE_ID);
      expect(event.entityRefs).toEqual([
        {
          entityType: plugin.instanceEntityType,
          entityId: INSTANCE_ID,
          role: 'subject',
        },
      ]);
    }

    const libraryRefsForInstance = await journal.readEntityHistory({
      entityType: plugin.libraryEntityType,
      entityId: INSTANCE_ID,
      afterCommitPosition: 0,
      throughCommitPosition: 99,
      limit: 20,
    });
    expect(libraryRefsForInstance).toEqual([]);
  });
});
